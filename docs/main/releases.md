---
id: releases
title: OpenEBS Releases
keywords:
  - OpenEBS Releases
  - OpenEBS Release Notes
  - Releases
  - Release Notes
description: This page contains list of supported OpenEBS releases.
---

**Release Date: DD MONTH YYYY**

OpenEBS is a collection of data engines and operators to create different types of replicated and local persistent volumes for Kubernetes Stateful workloads. Kubernetes volumes can be provisioned via CSI Drivers or using Out-of-tree Provisioners.
The status of the various components as of v4.4 are as follows:

- Local Storage (a.k.a Local Engine)
  - [Local PV Hostpath 4.3.0](https://github.com/openebs/dynamic-localpv-provisioner) (stable)
  - [Local PV LVM 1.7.0](https://github.com/openebs/lvm-localpv) (stable)
  - [Local PV ZFS 2.8.0](https://github.com/openebs/zfs-localpv) (stable)

- Replicated Storage (a.k.a Replicated Engine)
  - [Replicated PV Mayastor 2.9.0](https://github.com/openebs/mayastor) (stable)

- Out-of-tree (External Storage) Provisioners 
  - [Local PV Hostpath 4.3.0](https://github.com/openebs/dynamic-localpv-provisioner) (stable)

- Other Components
  - [CLI 4.3.0](https://github.com/openebs/openebs/tree/release/4.3/plugin)

## What’s New

OpenEBS is delighted to introduce the following new features with OpenEBS 4.4:

- **Support for Installing Both Replicated PV Mayastor and Local PV LVM on OpenShift**

  You can now install both Replicated PV Mayastor and Local PV LVM on OpenShift using a unified Helm-based deployment process. In earlier releases, only Replicated PV Mayastor installation was supported on OpenShift.

- **DiskPool Expansion**

  You can now expand existing Replicated PV Mayastor DiskPools using the maxExpansion parameter. This feature allows controlled, on-demand capacity increases while preventing ENOSPC errors and ensuring uninterrupted application availability.

- **Safely Pause Pool Activity**

  You can now temporarily cordon Replicated PV Mayastor pools to block new replicas, snapshots, restores, or imports. This feature helps you perform maintenance or decommission storage safely while keeping existing data fully available and unaffected.

- **Optimize Storage Performance**

  You can now configure the SPDK blobstore cluster size when creating Replicated PV Mayastor DiskPools. This option lets you fine-tune on-disk layout and performance for your workloads—using smaller clusters for efficiency or larger clusters for faster pool creation, imports, and sequential I/O operations.

## Enhancements

### Replicated Storage

- 

### Local Storage

- 

## Fixes

### Local Storage

- 

## Known Issues

### Replicated Storage

- DiskPool capacity expansion is not supported as of v2.9.0.
- If a node hosting a pod reboots and the pod lacks a controller (like a Deployment), the volume unpublish operation may not trigger. This causes the control plane to assume the volume is still in use, which leads to `fsfreeze` operation failure during snapshots.
**Workaround:** Recreate or rebind the pod to ensure proper volume mounting.
- If a disk backing a DiskPool fails or is removed (Example: A cloud disk detaches), the failure is not clearly reflected in the system. As a result, the volume may remain in a degraded state for an extended period.
- Large pools (Example: 10–20TiB) may hang during recovery after a dirty shutdown of the node hosting the io-engine.
- Provisioning very large filesystem volumes (Example: More than 15TiB) may fail due to filesystem formatting timeouts or hangs.
- When using Replicated PV Mayastor on Oracle Linux 9 (kernel 5.14.x), servers may unexpectedly reboot during volume detach operations due to a kernel bug (CVE-2024-53170) in the block layer.
This issue is not caused by Mayastor but is triggered more frequently because of its NVMe-TCP connection lifecycle.
**Workaround:** Upgrade to kernel 6.11.11, 6.12.2, or later, which includes the fix.

### Local Storage

- For Local PV LVM and Local PV ZFS, you may face issues on single-node setups post-upgrade where the controller pod does not enter the `Running` state due to changes in the manifest and missing affinity rules.
**Workaround:** Delete the old controller pod to allow scheduling of the new one. This does not occur when upgrading from the previous release.

- For Local PV LVM, thin pool capacity is not unmapped or reclaimed and is also not tracked in the `lvmnode` custom resource. This may result in unexpected behavior.

## Limitations (If any)

### Replicated Storage

- The IO engine fully utilizes all allocated CPU cores regardless of the actual I/O load, as it runs a poller at full speed.
- Each DiskPool is limited to a single block device and cannot span across multiple devices.
- The data-at-rest encryption feature does not support rotation of Data Encryption Keys (DEKs).

## Related Information

OpenEBS Release notes are maintained in the GitHub repositories alongside the code and releases. For summary of what changes across all components in each release and to view the full Release Notes, see [OpenEBS Release 4.4](https://github.com/openebs/openebs/releases/tag/v4.4).

See version specific Releases to view the legacy OpenEBS Releases.

## See Also

- [Quickstart](./quickstart-guide/prerequisites.md)
- [Deployment](./deploy-a-test-application.md)
- [OpenEBS Architecture](./concepts/architecture.md)
- [OpenEBS Local Storage](./concepts/data-engines/local-storage.md)
- [OpenEBS Replicated Storage](./concepts/data-engines/replicated-storage.md)
- [Community](community.md)
- [Commercial Support](commercial-support.md)