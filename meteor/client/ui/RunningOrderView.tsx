import { Meteor } from 'meteor/meteor'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { withTracker } from '../lib/ReactMeteorData/react-meteor-data'
import { translate, InjectedTranslateProps } from 'react-i18next'
import * as CoreIcon from '@nrk/core-icons/jsx'
import { Spinner } from '../lib/Spinner'

import * as ClassNames from 'classnames'
import * as $ from 'jquery'
import { Time } from '../../lib/lib'
import Moment from 'react-moment'
import timer from 'react-timer-hoc'
import { parse as queryStringParse } from 'query-string'

import { NavLink } from 'react-router-dom'

import { RunningOrder, RunningOrders } from '../../lib/collections/RunningOrders'
import { Segment, Segments } from '../../lib/collections/Segments'
import { StudioInstallation, StudioInstallations } from '../../lib/collections/StudioInstallations'
import { SegmentLine, SegmentLines } from '../../lib/collections/SegmentLines'

import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu'

import { RunningOrderTimingProvider, withTiming, RunningOrderTiming } from './RunningOrderTiming'
import { SegmentTimelineContainer, SegmentLineItemUi, SegmentUi } from './SegmentTimeline/SegmentTimelineContainer'
import { SegmentContextMenu } from './SegmentTimeline/SegmentContextMenu'
import { InspectorDrawer } from './InspectorDrawer/InspectorDrawer'
import { RunningOrderOverview } from './RunningOrderOverview'

import { getCurrentTime } from '../../lib/lib'
import { RundownUtils } from '../lib/rundown'

import * as mousetrap from 'mousetrap'
import * as _ from 'underscore'

interface IKeyboardFocusMarkerState {
	inFocus: boolean
}

class KeyboardFocusMarker extends React.Component<any, IKeyboardFocusMarkerState> {
	keyboardFocusInterval: number

	constructor (props) {
		super(props)

		this.state = {
			inFocus: true
		}
	}

	componentDidMount () {
		this.keyboardFocusInterval = Meteor.setInterval(this.checkFocus, 3000)
		$(document.body).on('focusin mousedown focus', this.checkFocus)
	}

	componentWillUnmount () {
		Meteor.clearInterval(this.keyboardFocusInterval)
		$(document.body).off('focusin mousedown focus', this.checkFocus)
	}

	checkFocus = () => {
		const focusNow = document.hasFocus()
		if (this.state.inFocus !== focusNow) {
			this.setState({
				inFocus: focusNow
			})
		}
	}

	render () {
		if (this.state.inFocus) {
			return null
		} else {
			return (
				<div className='running-order-view__focus-lost-frame'></div>
			)
		}
	}
}

interface IHeaderProps {
	runningOrder: RunningOrder
}

interface ITimerHeaderProps extends IHeaderProps {
}

enum RunningOrderViewKbdShortcuts {
	RUNNING_ORDER_TAKE = 'f12',
	RUNNING_ORDER_ACTIVATE = 'f2',
	RUNNING_ORDER_DEACTIVATE = 'mod+shift+f2'
}

const TimingDisplay = translate()(withTiming()(class extends React.Component<ITimerHeaderProps & InjectedTranslateProps & RunningOrderTiming.InjectedROTimingProps> {
	render () {
		const { t } = this.props

		if (!this.props.runningOrder) return null

		return (
			<div className='timing mod'>
				{this.props.runningOrder.startedPlayback ?
					<span className='timing-clock plan-start left'>
						<span className='timing-clock-label left'>{t('Started')}</span>
						<Moment interval={0} format='HH:mm:ss' date={this.props.runningOrder.startedPlayback} />
					</span> :
					<span className='timing-clock plan-start left'>
						<span className='timing-clock-label left'>{t('Planned start')}</span>
						<Moment interval={0} format='HH:mm:ss' date={this.props.runningOrder.expectedStart} />
					</span>
				}
				{ this.props.runningOrder.startedPlayback ?
					this.props.runningOrder.expectedStart &&
						<span className='timing-clock countdown playback-started left'>
							{RundownUtils.formatDiffToTimecode(this.props.runningOrder.startedPlayback - this.props.runningOrder.expectedStart, true, true, true)}
						</span>
					:
					this.props.runningOrder.expectedStart &&
						<span className={ClassNames('timing-clock countdown plan-start left', {
							'heavy': getCurrentTime() > this.props.runningOrder.expectedStart
						})}>
							{RundownUtils.formatDiffToTimecode(getCurrentTime() - this.props.runningOrder.expectedStart, true, true, true)}
						</span>
				}
				<span className='timing-clock time-now'><Moment interval={0} format='HH:mm:ss' date={getCurrentTime()} /></span>
				{ this.props.runningOrder.expectedDuration ?
					(<React.Fragment>
						{this.props.runningOrder.expectedStart && this.props.runningOrder.expectedDuration &&
							<span className='timing-clock plan-end right visual-last-child'>
								<span className='timing-clock-label right'>{t('Planned end')}</span>
								<Moment interval={0} format='HH:mm:ss' date={this.props.runningOrder.expectedStart + this.props.runningOrder.expectedDuration} />
							</span>
						}
						{this.props.runningOrder.expectedStart && this.props.runningOrder.expectedDuration &&
							<span className='timing-clock countdown plan-end right'>
								{RundownUtils.formatDiffToTimecode(getCurrentTime() - (this.props.runningOrder.expectedStart + this.props.runningOrder.expectedDuration), true, true, true)}
							</span>
						}
						{this.props.runningOrder.expectedDuration &&
							<span className={ClassNames('timing-clock heavy-light right', {
								'heavy': (this.props.timingDurations.asPlayedRundownDuration || 0) > (this.props.runningOrder.expectedDuration || 0),
								'light': (this.props.timingDurations.asPlayedRundownDuration || 0) < (this.props.runningOrder.expectedDuration || 0)
							})}>
								<span className='timing-clock-label right'>{t('Diff')}</span>
								{RundownUtils.formatDiffToTimecode(this.props.runningOrder.expectedDuration - (this.props.timingDurations.asPlayedRundownDuration || 0), true, true, true)}
							</span>
						}
					</React.Fragment>) :
					(<React.Fragment>
						{this.props.timingDurations ?
							<span className='timing-clock plan-end right visual-last-child'>
								<span className='timing-clock-label right'>{t('Expected end')}</span>
								<Moment interval={0} format='HH:mm:ss' date={getCurrentTime() + (this.props.timingDurations.totalRundownDuration || 0)} />
							</span> :
							null
						}
						{this.props.timingDurations ?
							<span className={ClassNames('timing-clock heavy-light right', {
								'heavy': (this.props.timingDurations.asPlayedRundownDuration || 0) > (this.props.timingDurations.totalRundownDuration || 0),
								'light': (this.props.timingDurations.asPlayedRundownDuration || 0) < (this.props.timingDurations.totalRundownDuration || 0)
							})}>
								<span className='timing-clock-label right'>{t('Diff')}</span>
								{RundownUtils.formatDiffToTimecode((this.props.timingDurations.totalRundownDuration || 0) - (this.props.timingDurations.asPlayedRundownDuration || 0), true, true, true)}
							</span> :
							null
						}
					</React.Fragment>)
				}
			</div>
		)
	}
}))

const RunningOrderHeader = translate()(class extends React.Component<InjectedTranslateProps & IHeaderProps> {
	componentDidMount () {
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_TAKE, this.disableKey, 'keydown')
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_TAKE, this.keyTake, 'keyup')
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_ACTIVATE, this.disableKey, 'keydown')
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_ACTIVATE, this.keyActivate, 'keyup')
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_DEACTIVATE, this.disableKey, 'keydown')
		mousetrap.bind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_DEACTIVATE, this.keyDeactivate, 'keyup')
	}

	componentWillUnmount () {
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_TAKE, 'keydown')
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_TAKE, 'keyup')
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_ACTIVATE, 'keydown')
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_ACTIVATE, 'keyup')
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_DEACTIVATE, 'keydown')
		mousetrap.unbind(RunningOrderViewKbdShortcuts.RUNNING_ORDER_DEACTIVATE, 'keyup')
	}

	disableKey = (e: ExtendedKeyboardEvent) => {
		e.preventDefault()
		e.stopImmediatePropagation()
		e.stopPropagation()
	}

	keyTake = (e: ExtendedKeyboardEvent) => {
		e.preventDefault()
		e.stopImmediatePropagation()
		e.stopPropagation()
		this.take()
	}

	keyActivate = (e: ExtendedKeyboardEvent) => {
		this.activate()
	}

	keyDeactivate = (e: ExtendedKeyboardEvent) => {
		this.deactivate()
	}

	take = () => {
		Meteor.call('playout_take', this.props.runningOrder._id)
		console.log(new Date(getCurrentTime()))
	}

	activate = () => {
		if (!this.props.runningOrder.active) {
			Meteor.call('playout_activate', this.props.runningOrder._id)
		}
	}

	deactivate = () => {
		if (this.props.runningOrder.active) {
			Meteor.call('playout_inactivate', this.props.runningOrder._id)
		}
	}

	reloadRunningOrder = () => {
		Meteor.call('playout_reload_data', this.props.runningOrder._id)
	}

	render () {
		const { t } = this.props
		return (
			<div className='header running-order'>
				<div className='row super-dark'>
					<div className='flex-col left horizontal-align-left'>
						{/* !!! TODO: This is just a temporary solution !!! */}
						<div className='badge mod'>
							<div className='media-elem mrs sofie-logo' />
							<div className='bd mls'><span className='logo-text'>Sofie</span></div>
						</div>
					</div>
					<div className='flex-col right horizontal-align-right'>
						<div className='links mod close'>
							<NavLink to='/runningOrders'>
								<CoreIcon id='nrk-close' />
							</NavLink>
						</div>
					</div>
					<ContextMenu id='running-order-context-menu'>
						<div className='react-contextmenu-label'>
							{this.props.runningOrder && this.props.runningOrder.name}
						</div>
						{
							this.props.runningOrder && this.props.runningOrder.active ?
								<React.Fragment>
									<MenuItem onClick={(e) => this.deactivate()}>
										{t('Deactivate')}
									</MenuItem>
									<MenuItem onClick={(e) => this.take()}>
										{t('Take')}
									</MenuItem>
								</React.Fragment> :
								<React.Fragment>
									<MenuItem onClick={(e) => this.activate()}>
										{t('Activate')}
									</MenuItem>
								</React.Fragment>
						}
						<MenuItem onClick={(e) => this.reloadRunningOrder()}>
							{t('Reload running order')}
						</MenuItem>
					</ContextMenu>
					<ContextMenuTrigger id='running-order-context-menu' attributes={{
						className: 'flex-col col-timing horizontal-align-center'
					}}>
						<TimingDisplay {...this.props} />
					</ContextMenuTrigger>
				</div>
				<div className='row dark'>
					<div className='col c12 running-order-overview'>
						{this.props.runningOrder && <RunningOrderOverview runningOrderId={this.props.runningOrder._id} /> }
					</div>
				</div>
			</div>
		)
	}
})

interface IPropsHeader extends InjectedTranslateProps {
	key: string
	runningOrder: RunningOrder
	segments: Array<Segment>
	studioInstallation: StudioInstallation
	match: {
		params: {
			runningOrderId: string
		}
	}
}

interface IStateHeader {
	timeScale: number
	studioMode: boolean
	contextMenuContext: any
	bottomMargin: string
}

export const RunningOrderView = translate()(withTracker((props: IPropsHeader, state) => {

	let runningOrderId = decodeURIComponent(props.match.params.runningOrderId)

	let runningOrder = RunningOrders.findOne({ _id: runningOrderId })
	// let roDurations = calculateDurations(runningOrder, segmentLines)
	return {
		runningOrder: runningOrder,
		segments: runningOrder ? Segments.find({ runningOrderId: runningOrder._id }, {
			sort: {
				'_rank': 1
			}
		}).fetch() : undefined,
		studioInstallation: runningOrder ? StudioInstallations.findOne({ _id: runningOrder.studioInstallationId }) : undefined,
	}
})(
class extends React.Component<IPropsHeader, IStateHeader> {

	private _subscriptions: Array<Meteor.SubscriptionHandle> = []
	constructor (props) {
		super(props)

		this.state = {
			timeScale: 0.05,
			studioMode: localStorage.getItem('studioMode') === '1' ? true : false,
			contextMenuContext: null,
			bottomMargin: ''
		}

	}

	componentWillMount () {
		// Subscribe to data:
		let runningOrderId = this.props.match.params.runningOrderId

		this._subscriptions.push(Meteor.subscribe('runningOrders', {
			_id: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('segments', {
			runningOrderId: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('segmentLines', {
			runningOrderId: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('segmentLineItems', {
			runningOrderId: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('studioInstallations', {
			runningOrderId: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('showStyles', {
			runningOrderId: runningOrderId
		}))
		this._subscriptions.push(Meteor.subscribe('segmentLineAdLibItems', {
			runningOrderId: runningOrderId
		}))
	}
	componentDidMount () {
		$(document.body).addClass('dark')
	}
	componentWillUnmount () {
		$(document.body).removeClass('dark')

		_.each(this._subscriptions, (sub ) => {
			sub.stop()
		})
	}

	onTimeScaleChange = (timeScaleVal) => {
		if (Number.isFinite(timeScaleVal) && timeScaleVal > 0) {
			this.setState({
				timeScale: timeScaleVal
			})
		}
	}

	totalRundownDuration () {
		return 0
	}

	onContextMenu = (contextMenuContext: any) => {
		this.setState({
			contextMenuContext
		})
	}

	onSetNext = (segmentLine: SegmentLine) => {
		if (segmentLine && segmentLine._id) {
			Meteor.call('debug_setNextLine', segmentLine._id)
		}
	}

	renderSegments () {
		if (this.props.segments !== undefined && this.props.studioInstallation !== undefined) {
			return this.props.segments.map((segment) => (
				<SegmentTimelineContainer key={segment._id}
										  studioInstallation={this.props.studioInstallation}
										  segment={segment}
										  runningOrder={this.props.runningOrder}
										  liveLineHistorySize='100'
										  timeScale={this.state.timeScale}
										  onTimeScaleChange={this.onTimeScaleChange}
										  onContextMenu={this.onContextMenu}
										  />
			))
		} else {
			return (
				<div></div>
			)
		}
	}

	renderSegmentsList () {
		const { t } = this.props

		if (this.props.runningOrder !== undefined) {
			return (
				<div>
					{this.renderSegments()}
				</div>
			)
		} else {
			return (
				<div className='mod'>
					<Spinner />
				</div>
			)
		}
	}

	onChangeBottomMargin = (newBottomMargin: string) => {
		this.setState({
			bottomMargin: newBottomMargin
		})
	}

	getStyle () {
		return {
			'marginBottom': this.state.bottomMargin
		}
	}

	render () {
		const { t } = this.props

		return (
			<RunningOrderTimingProvider
				runningOrder={this.props.runningOrder}>
				<div className='running-order-view' style={this.getStyle()}>
					<KeyboardFocusMarker />
					<RunningOrderHeader
						runningOrder={this.props.runningOrder} />
					<SegmentContextMenu
						contextMenuContext={this.state.contextMenuContext}
						runningOrder={this.props.runningOrder}
						onSetNext={this.onSetNext} />
					{this.renderSegmentsList()}
					<InspectorDrawer {...this.props}
						onChangeBottomMargin={this.onChangeBottomMargin} />
				</div>
			</RunningOrderTimingProvider>
		)
	}
}
))
