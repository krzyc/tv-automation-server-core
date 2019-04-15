import { Translated } from '../../lib/ReactMeteorData/ReactMeteorData'
import { translate } from 'react-i18next'
import * as React from 'react'
import { mousetrapHelper } from '../../lib/mousetrapHelper'
import { ShowStyleBase } from '../../../lib/collections/ShowStyleBases'

interface IProps {
	visible?: boolean
	showStyleBase: ShowStyleBase

	hotkeys: Array<{
		key: string
		label: string
	}>
}

export const HotkeyHelpPanel = translate()(class BaseHotkeyHelpPanel extends React.Component<Translated<IProps>> {
	private _isMacLike: boolean = false

	constructor (props: Translated<IProps>) {
		super(props)

		this._isMacLike = navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? true : false
	}

	render () {
		if (this.props.visible) {
			return (
				<div className='adlib-panel super-dark'>
					<div className='adlib-panel__hotkeys'>
						{this.props.hotkeys.concat(this.props.showStyleBase.hotkeyLegend || []).map((hotkey) =>
							<div className='adlib-panel__hotkeys__hotkey' key={hotkey.key}>
								<div className='adlib-panel__hotkeys__hotkey__keys'>
									{mousetrapHelper.shortcutLabel(hotkey.key, this._isMacLike)}
								</div>
								<div className='adlib-panel__hotkeys__hotkey__action'>
									{hotkey.label}
								</div>
							</div>
						)}
					</div>
				</div>
			)
		} else {
			return null
		}
	}
})
