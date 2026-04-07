import containerConfig from '../config/containerConfig'

// Deep-clone each container's field list so mutations don't affect the source defaults.
const buildDefaults = () =>
  Object.fromEntries(
    Object.entries(containerConfig).map(([k, fields]) => [
      k,
      fields.map(f => ({ ...f })),
    ])
  )

export default {
  upperCase: true,
  // Multi-page downloads (< 25 pages)
  suppressDownloadWarning: true,
  parallelDownloads: true,
  // Big file downloads (25+ pages)
  suppressBigFileWarning: false,
  parallelBigFileDownloads: true,
  containers: buildDefaults(),
}
