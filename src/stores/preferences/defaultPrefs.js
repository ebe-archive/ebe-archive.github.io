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
  containers: buildDefaults(),
}
