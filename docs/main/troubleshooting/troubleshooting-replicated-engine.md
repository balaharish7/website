---
id: troubleshootingre
title: Troubleshooting - Replicated Engine
slug: /troubleshootingre
keywords:
  - OpenEBS
  - OpenEBS troubleshooting
description: This page contains a list of OpenEBS related troubleshooting which contains information like troubleshooting installation, troubleshooting uninstallation, and troubleshooting replicated engine.
---
# Troubleshooting - Replicated Engine

## Logs

The correct set of log file to collect depends on the nature of the problem. If unsure, then it is best to collect log files for all Mayastor containers.  In nearly every  case, the logs of all of the control plane component pods will be needed;

* csi-controller
* core-agent
* rest
* msp-operator

{% tabs %}
{% tab title="List all Mayastor pods" %}
```bash
kubectl -n mayastor get pods -o wide
```
{% endtab %}

{% tab title="Output example" %}
```text
NAME                    READY   STATUS    RESTARTS   AGE   IP             NODE       NOMINATED NODE   READINESS GATES
mayastor-csi-7pg82      2/2     Running   0          15m   10.0.84.131    worker-2   <none>           <none>
mayastor-csi-gmpq6      2/2     Running   0          15m   10.0.239.174   worker-1   <none>           <none>
mayastor-csi-xrmxx      2/2     Running   0          15m   10.0.85.71     worker-0   <none>           <none>
mayastor-qgpw6          1/1     Running   0          14m   10.0.85.71     worker-0   <none>           <none>
mayastor-qr84q          1/1     Running   0          14m   10.0.239.174   worker-1   <none>           <none>
mayastor-xhmj5          1/1     Running   0          14m   10.0.84.131    worker-2   <none>           <none>
... etc (output truncated for brevity)
```
{% endtab %}
{% endtabs %}


### Mayastor pod log file

Mayastor containers form the data plane of a Mayastor deployment. A cluster should schedule as many mayastor container instances as required storage nodes have been defined. This log file is most useful when troubleshooting I/O errors however, provisioning and management operations might also fail because of a problem on a storage node.

{% tabs %}
{% tab title="Example obtaining mayastor\'s log" %}
```bash
kubectl -n mayastor logs mayastor-qgpw6 mayastor
```
{% endtab %}
{% endtabs %}

### CSI agent pod log file

If experiencing problems with \(un\)mounting a volume on an application node, this log file can be useful. Generally all worker nodes in the cluster will be configured to schedule a mayastor CSI agent pod, so it's good to know which specific node is experiencing the issue and inspect the log file only for that node.

{% tabs %}
{% tab title="Example obtaining mayastor CSI driver\'s log" %}
```bash
kubectl -n mayastor logs mayastor-csi-7pg82 mayastor-csi
```
{% endtab %}
{% endtabs %}

### CSI sidecars

These containers implement the CSI spec for Kubernetes and run within the same pods as the csi-controller and mayastor-csi (node plugin) containers. Whilst they are not part of Mayastor's code, they can contain useful information when a Mayastor CSI controller/node plugin fails to register with k8s cluster.

{% tabs %}
{% tab title="Obtaining CSI control containers logs" %}
```bash
kubectl -n mayastor logs $(kubectl -n mayastor get pod -l app=moac -o jsonpath="{.items[0].metadata.name}") csi-attacher
kubectl -n mayastor logs $(kubectl -n mayastor get pod -l app=moac -o jsonpath="{.items[0].metadata.name}") csi-provisioner
```
{% endtab %}
{% endtabs %}

{% tabs %}
{% tab title="Example obtaining CSI node container log" %}
```bash
kubectl -n mayastor logs mayastor-csi-7pg82 csi-driver-registrar
```
{% endtab %}
{% endtabs %}

## Coredumps

A coredump is a snapshot of process' memory combined with auxiliary information \(PID, state of registers, etc.\) and saved to a file. It is used for post-mortem analysis and it is generated automatically by the operating system in case of a severe, unrecoverable error \(i.e. memory corruption\) causing the process to panic. Using a coredump for a problem analysis requires deep knowledge of program internals and is usually done only by developers. However, there is a very useful piece of information that users can retrieve from it and this information alone can often identify the root cause of the problem. That is the stack \(backtrace\) - a record of the last action that the program was performing at the time when it crashed. Here we describe how to get it. The steps as shown apply specifically to Ubuntu, other linux distros might employ variations.

We rely on systemd-coredump that saves and manages coredumps on the system, `coredumpctl` utility that is part of the same package and finally the `gdb` debugger.

{% tabs %}
{% tab title="Install systemd-coredump and gdb" %}
```bash
sudo apt-get install -y systemd-coredump gdb lz4
```
{% endtab %}
{% endtabs %}

If installed correctly then the global core pattern will be set so that all generated coredumps will be piped to the `systemd-coredump` binary.

{% tabs %}
{% tab title="Verify coredump configuration" %}
```bash
cat /proc/sys/kernel/core_pattern
```
{% endtab %}

{% tab title="Output example" %}
```text
|/lib/systemd/systemd-coredump %P %u %g %s %t 9223372036854775808 %h
```
{% endtab %}
{% endtabs %}

{% tabs %}
{% tab title="List coredumps" %}
```bash
coredumpctl list
```
{% endtab %}

{% tab title="Output example" %}
```text
TIME                            PID   UID   GID SIG COREFILE  EXE
Tue 2021-03-09 17:43:46 UTC  206366     0     0   6 present   /bin/mayastor
```
{% endtab %}
{% endtabs %}

If there is a new coredump from the mayastor container, the coredump alone won't be that useful. GDB needs to access the binary of crashed process in order to be able to print at least some information in the backtrace. For that, we need to copy the contents of the container's filesystem to the host.

{% tabs %}
{% tab title="Get ID of the mayastor container" %}
```bash
docker ps | grep mayadata/mayastor
```
{% endtab %}

{% tab title="Output example" %}
```text
b3db4615d5e1        mayadata/mayastor                          "sleep 100000"           27 minutes ago      Up 27 minutes                           k8s_mayastor_mayastor-n682s_mayastor_51d26ee0-1a96-44c7-85ba-6e50767cd5ce_0
d72afea5bcc2        mayadata/mayastor-csi                      "/bin/mayastor-csi -…"   7 hours ago         Up 7 hours                              k8s_mayastor-csi_mayastor-csi-xrmxx_mayastor_d24017f2-5268-44a0-9fcd-84a593d7acb2_0
```
{% endtab %}
{% endtabs %}

{% tabs %}
{% tab title="Copy relevant parts of the container\'s fs" %}
```bash
mkdir -p /tmp/rootdir
docker cp b3db4615d5e1:/bin /tmp/rootdir
docker cp b3db4615d5e1:/nix /tmp/rootdir
```
{% endtab %}
{% endtabs %}

Now we can start GDB. _Don't_ use the `coredumpctl` command for starting the debugger. It invokes GDB with invalid path to the debugged binary hence stack unwinding fails for Rust functions. At first we extract the compressed coredump.

{% tabs %}
{% tab title="Find location of the compressed coredump" %}
```bash
coredumpctl info | grep Storage | awk '{ print $2 }'
```
{% endtab %}

{% tab title="Output example" %}
```text
/var/lib/systemd/coredump/core.mayastor.0.6a5e550e77ee4e77a19bd67436ce7a98.64074.1615374302000000000000.lz4
```
{% endtab %}
{% endtabs %}

{% tabs %}
{% tab title="Extract the coredump" %}
```bash
sudo lz4cat /var/lib/systemd/coredump/core.mayastor.0.6a5e550e77ee4e77a19bd67436ce7a98.64074.1615374302000000000000.lz4 >core
```
{% endtab %}
{% endtabs %}

{% tabs %}
{% tab title="Open coredump in GDB" %}
```bash
gdb -c core /tmp/rootdir$(readlink /tmp/rootdir/bin/mayastor)
```
{% endtab %}

{% tab title="Output example" %}
```text
GNU gdb (Ubuntu 9.2-0ubuntu1~20.04) 9.2
Copyright (C) 2020 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
Type "show copying" and "show warranty" for details.
This GDB was configured as "x86_64-linux-gnu".
Type "show configuration" for configuration details.
For bug reporting instructions, please see:
<http://www.gnu.org/software/gdb/bugs/>.
Find the GDB manual and other documentation resources online at:
    <http://www.gnu.org/software/gdb/documentation/>.

For help, type "help".
Type "apropos word" to search for commands related to "word"...
[New LWP 13]
[New LWP 17]
[New LWP 14]
[New LWP 16]
[New LWP 18]
Core was generated by `/bin/mayastor -l0 -nnats'.
Program terminated with signal SIGABRT, Aborted.
#0  0x00007ffdad99fb37 in clock_gettime ()
[Current thread is 1 (LWP 13)]
```
{% endtab %}
{% endtabs %}

Once in GDB we need to set a sysroot so that GDB knows where to find the binary for the debugged program.

{% tabs %}
{% tab title="Set sysroot in GDB" %}
```bash
set auto-load safe-path /tmp/rootdir
set sysroot /tmp/rootdir
```
{% endtab %}

{% tab title="Output example" %}
```text
Reading symbols from /tmp/rootdir/nix/store/f1gzfqq10dlha1qw10sqvgil34qh30af-systemd-246.6/lib/libudev.so.1...
(No debugging symbols found in /tmp/rootdir/nix/store/f1gzfqq10dlha1qw10sqvgil34qh30af-systemd-246.6/lib/libudev.so.1)
Reading symbols from /tmp/rootdir/nix/store/0kdiav729rrcdwbxws653zxz5kngx8aa-libspdk-dev-21.01/lib/libspdk.so...
Reading symbols from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libdl.so.2...
(No debugging symbols found in /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libdl.so.2)
Reading symbols from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libgcc_s.so.1...
(No debugging symbols found in /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libgcc_s.so.1)
Reading symbols from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0...
...
```
{% endtab %}
{% endtabs %}

After that we can print backtrace\(s\).

{% tabs %}
{% tab title="Obtain backtraces for all threads in GDB" %}
```bash
thread apply all bt
```
{% endtab %}

{% tab title="Output example" %}
```text
Thread 5 (Thread 0x7f78248bb640 (LWP 59)):
#0  0x00007f7825ac0582 in __lll_lock_wait () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#1  0x00007f7825ab90c1 in pthread_mutex_lock () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#2  0x00005633ca2e287e in async_io::driver::main_loop ()
#3  0x00005633ca2e27d9 in async_io::driver::UNPARKER::{{closure}}::{{closure}} ()
#4  0x00005633ca2e27c9 in std::sys_common::backtrace::__rust_begin_short_backtrace ()
#5  0x00005633ca2e27b9 in std::thread::Builder::spawn_unchecked::{{closure}}::{{closure}} ()
#6  0x00005633ca2e27a9 in <std::panic::AssertUnwindSafe<F> as core::ops::function::FnOnce<()>>::call_once ()
#7  0x00005633ca2e26b4 in core::ops::function::FnOnce::call_once{{vtable-shim}} ()
#8  0x00005633ca723cda in <alloc::boxed::Box<F,A> as core::ops::function::FnOnce<Args>>::call_once () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454/library/alloc/src/boxed.rs:1546
#9  <alloc::boxed::Box<F,A> as core::ops::function::FnOnce<Args>>::call_once () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454/library/alloc/src/boxed.rs:1546
#10 std::sys::unix::thread::Thread::new::thread_start () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454//library/std/src/sys/unix/thread.rs:71
#11 0x00007f7825ab6e9e in start_thread () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#12 0x00007f78259e566f in clone () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6

Thread 4 (Thread 0x7f7824cbd640 (LWP 57)):
#0  0x00007f78259e598f in epoll_wait () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6
#1  0x00005633ca2e414b in async_io::reactor::ReactorLock::react ()
#2  0x00005633ca583c11 in async_io::driver::block_on ()
#3  0x00005633ca5810dd in std::sys_common::backtrace::__rust_begin_short_backtrace ()
#4  0x00005633ca580e5c in core::ops::function::FnOnce::call_once{{vtable-shim}} ()
#5  0x00005633ca723cda in <alloc::boxed::Box<F,A> as core::ops::function::FnOnce<Args>>::call_once () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454/library/alloc/src/boxed.rs:1546
#6  <alloc::boxed::Box<F,A> as core::ops::function::FnOnce<Args>>::call_once () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454/library/alloc/src/boxed.rs:1546
#7  std::sys::unix::thread::Thread::new::thread_start () at /rustc/d1206f950ffb76c76e1b74a19ae33c2b7d949454//library/std/src/sys/unix/thread.rs:71
#8  0x00007f7825ab6e9e in start_thread () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#9  0x00007f78259e566f in clone () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6

Thread 3 (Thread 0x7f78177fe640 (LWP 61)):
#0  0x00007f7825ac08b7 in accept () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#1  0x00007f7825c930bb in socket_listener () from /tmp/rootdir/nix/store/0kdiav729rrcdwbxws653zxz5kngx8aa-libspdk-dev-21.01/lib/libspdk.so
#2  0x00007f7825ab6e9e in start_thread () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#3  0x00007f78259e566f in clone () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6

Thread 2 (Thread 0x7f7817fff640 (LWP 60)):
#0  0x00007f78259e598f in epoll_wait () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6
#1  0x00007f7825c7f174 in eal_intr_thread_main () from /tmp/rootdir/nix/store/0kdiav729rrcdwbxws653zxz5kngx8aa-libspdk-dev-21.01/lib/libspdk.so
#2  0x00007f7825ab6e9e in start_thread () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libpthread.so.0
#3  0x00007f78259e566f in clone () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6

Thread 1 (Thread 0x7f782559f040 (LWP 56)):
#0  0x00007fff849bcb37 in clock_gettime ()
#1  0x00007f78259af1d0 in clock_gettime@GLIBC_2.2.5 () from /tmp/rootdir/nix/store/a6rnjp15qgp8a699dlffqj94hzy1nldg-glibc-2.32/lib/libc.so.6
#2  0x00005633ca23ebc5 in <tokio::park::either::Either<A,B> as tokio::park::Park>::park ()
#3  0x00005633ca2c86dd in mayastor::main ()
#4  0x00005633ca2000d6 in std::sys_common::backtrace::__rust_begin_short_backtrace ()
#5  0x00005633ca2cad5f in main ()
```
{% endtab %}
{% endtabs %}

-------------

##  Diskpool behaviour  

The below behaviour may be encountered while uprading from older releases to Mayastor 2.4 release and above.

### Get Dsp

Running `kubectl get dsp -n mayastor` could result in the error due to the `v1alpha1` schema in the discovery cache. To resolve this, run the command `kubectl get diskpools.openebs.io -n mayastor`. After this kubectl discovery cache will be updated with `v1beta1` object for dsp. 
 
### Create API

When creating a Disk Pool with `kubectl create -f dsp.yaml`, you might encounter an error related to `v1alpha1` CR definitions. To resolve this, ensure your CR definition is updated to `v1beta1` in the YAML file (for example, `apiVersion: openebs.io/v1beta1`).

{% hint style="note" %}
You can validate the schema changes by executing `kubectl get crd diskpools.openebs.io`.
{% endhint %}

# Known Limitations

## Volume and Pool Capacity Expansion

Once provisioned, neither Mayastor Disk Pools nor Mayastor Volumes can be re-sized. A Mayastor Pool can have only a single block device as a member. Mayastor Volumes are exclusively thick-provisioned.

## Snapshots and Clones

Mayastor has no snapshot or cloning capabilities.

## Volumes are "Highly Durable" but without multipathing are not "Highly Available"

Mayastor Volumes can be configured \(or subsequently re-configured\) to be composed of 2 or more "children" or "replicas"; causing synchronously mirrored copies of the volumes's data to be maintained on more than one worker node and Disk Pool. This contributes additional "durability" at the persistence layer, ensuring that viable copies of a volume's data remain even if a Disk Pool device is lost.

A Mayastor volume is currently accessible to an application only via a single target instance \(NVMe-oF\) of a single Mayastor pod. However, if that Mayastor pod ceases to run \(through the loss of the worker node on which it's scheduled, execution failure, crashloopbackoff etc.\) the [HA switch-over module](https://mayastor.gitbook.io/introduction/advanced-operations/ha) detects the failure and moves the target to a healthy worker node to ensure I/O continuity.

# Known Issues

## Installation Issues

### A Mayastor pod restarts unexpectedly with exit code 132 whilst mounting a PVC

The Mayastor process has been sent the SIGILL signal as the result of attempting to execute an illegal instruction. This indicates that the host node's CPU does not satisfy the prerequisite instruction set level for Mayastor \(SSE4.2 on x86-64\).

### Deploying Mayastor on RKE & Fedora CoreOS

In addition to ensuring that the general prerequisites for installation are met, it is necessary to add the following directory mapping to the `services_kublet->extra_binds` section of the cluster's`cluster.yml file.`

```text
/opt/rke/var/lib/kubelet/plugins:/var/lib/kubelet/plugins
```

If this is not done, CSI socket paths won't match expected values and the Mayastor CSI driver registration process will fail, resulting in the inability to provision Mayastor volumes on the cluster.

## Other Issues

### Mayastor pod may restart if a pool disk is inaccessible

If the disk device used by a Mayastor pool becomes inaccessible or enters the offline state, the hosting Mayastor pod may panic.  A fix for this behaviour is under investigation.

### Lengthy worker node reboot times

When rebooting a node that runs applications mounting Mayastor volumes, this can take tens of minutes. The reason is the long default NVMe controller timeout \(`ctrl_loss_tmo`\). The solution is to follow the best k8s practices and cordon the node ensuring there aren't any application pods running on it before the reboot. Setting `ioTimeout` storage class parameter can be used to fine-tune the timeout.

### Node restarts on scheduling an application 

Deploying an application pod on a worker node which hosts Mayastor and Prometheus exporter causes that node to restart.
The issue originated because of a kernel bug. Once the nexus disconnects, the entries under `/host/sys/class/hwmon/` should get removed, which does not happen in this case(The issue was fixed via this [kernel patch](https://www.mail-archive.com/linux-kernel@vger.kernel.org/msg2413147.html)).

**Fix:** Use kernel version 5.13 or later if deploying Mayastor in conjunction with the Prometheus metrics exporter.
