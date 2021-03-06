import { PeripheralDevice } from '../../../../lib/collections/PeripheralDevices'
import { TSR } from 'tv-automation-sofie-blueprints-integration'
export interface IHttpSendDeviceSettingsComponentProps {
	parentDevice: PeripheralDevice
	deviceId: string
	device: TSR.DeviceOptionsAny
}
export interface IHttpSendDeviceSettingsComponentState {
	deleteConfirmMakeReadyId: string | undefined
	showDeleteConfirmMakeReady: boolean
	editedMakeReady: Array<string>
}
export interface IPlayoutDeviceSettingsComponentProps {
	device: PeripheralDevice
	subDevices?: PeripheralDevice[]
}
export interface IPlayoutDeviceSettingsComponentState {
	deleteConfirmDeviceId: string | undefined
	showDeleteConfirm: boolean
	editedDevices: Array<string>
}
