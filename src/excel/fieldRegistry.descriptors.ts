import type { FieldDescriptor } from './fieldRegistry.types'
import { locationFieldDescriptors } from './fieldRegistry.location'
import { robotFieldDescriptors } from './fieldRegistry.robot'
import { toolingFieldDescriptors } from './fieldRegistry.tooling'
import { simulationFieldDescriptors } from './fieldRegistry.simulation'
import { peopleAndLogisticsFieldDescriptors } from './fieldRegistry.peopleAndLogistics'

export const FIELD_DESCRIPTORS: FieldDescriptor[] = [
  ...locationFieldDescriptors,
  ...robotFieldDescriptors,
  ...toolingFieldDescriptors,
  ...simulationFieldDescriptors,
  ...peopleAndLogisticsFieldDescriptors
]
