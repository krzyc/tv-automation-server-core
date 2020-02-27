import * as React from 'react'
import * as _ from 'underscore'
import * as ClassNames from 'classnames'

import { withTracker } from "../../lib/ReactMeteorData/ReactMeteorData"
import { Segments } from "../../../lib/collections/Segments"
import { Rundown } from "../../../lib/collections/Rundowns"
import { Studio } from "../../../lib/collections/Studios"
import { ShowStyleBase } from "../../../lib/collections/ShowStyleBases"
import { SegmentUi, PartUi } from "../SegmentTimeline/SegmentTimelineContainer"
import { getResolvedSegment } from "../../../lib/Rundown"
import { MeteorReactComponent } from "../../lib/MeteorReactComponent"
import { SourceLayerType, CameraContent } from 'tv-automation-sofie-blueprints-integration';
import { RundownUtils } from '../../lib/rundown';
import Moment from 'react-moment';

interface IProps {
	id: string,
	segmentId: string,
	studio: Studio,
	showStyleBase: ShowStyleBase,
	rundown: Rundown,
	timeScale: number
}
interface IState {
	scrollLeft: number,
	collapsedOutputs: {
		[key: string]: boolean
	},
	collapsed: boolean,
	followLiveLine: boolean,
	livePosition: number
}
interface ITrackedProps {
	segmentui: SegmentUi | undefined,
	parts: Array<PartUi>,
	isLiveSegment: boolean,
	isNextSegment: boolean,
	currentLivePart: PartUi | undefined,
	hasRemoteItems: boolean,
	hasGuestItems: boolean,
	hasAlreadyPlayed: boolean,
	autoNextPart: boolean
}

export const CameraSegmentContainer = withTracker<IProps, IState, ITrackedProps>((props: IProps) => {
	// console.log('PeripheralDevices',PeripheralDevices);
	// console.log('PeripheralDevices.find({}).fetch()',PeripheralDevices.find({}, { sort: { created: -1 } }).fetch());
	const segment = Segments.findOne(props.segmentId) as SegmentUi | undefined

	// We need the segment to do anything
	if (!segment) {
		return {
			segmentui: undefined,
			parts: [],
			segmentNotes: [],
			isLiveSegment: false,
			isNextSegment: false,
			currentLivePart: undefined,
			hasRemoteItems: false,
			hasGuestItems: false,
			hasAlreadyPlayed: false,
			autoNextPart: false,
			followingPart: undefined
		}
	}

	let o = getResolvedSegment(props.showStyleBase, props.rundown, segment)

	return {
		segmentui: o.segmentExtended,
		parts: o.parts,
		isLiveSegment: o.isLiveSegment,
		currentLivePart: o.currentLivePart,
		isNextSegment: o.isNextSegment,
		hasAlreadyPlayed: o.hasAlreadyPlayed,
		hasRemoteItems: o.hasRemoteItems,
		hasGuestItems: o.hasGuestItems,
		autoNextPart: o.autoNextPart
	}
}, (data: ITrackedProps, props: IProps, nextProps: IProps): boolean => {
	// This is a potentailly very dangerous hook into the React component lifecycle. Re-use with caution.
	// Check obvious primitive changes
	if (
		(props.segmentId !== nextProps.segmentId) ||
		(props.timeScale !== nextProps.timeScale)
	) {
		return true
	}
	// Check rundown changes that are important to the segment
	if (
		(typeof props.rundown !== typeof nextProps.rundown) ||
		(
			(
				props.rundown.currentPartId !== nextProps.rundown.currentPartId ||
				props.rundown.nextPartId !== nextProps.rundown.nextPartId
			) && (
				data.parts &&
				(
					data.parts.find(i => (i._id === props.rundown.currentPartId) || (i._id === nextProps.rundown.currentPartId)) ||
					data.parts.find(i => (i._id === props.rundown.nextPartId) || (i._id === nextProps.rundown.nextPartId))
				)
			)
		) ||
		(
			props.rundown.holdState !== nextProps.rundown.holdState
		)
	) {
		return true
	}
	// Check studio installation changes that are important to the segment.
	// We also could investigate just skipping this and requiring a full reload if the studio installation is changed
	if (
		(typeof props.studio !== typeof nextProps.studio) ||
		!_.isEqual(props.studio.settings, nextProps.studio.settings) ||
		!_.isEqual(props.studio.config, nextProps.studio.config) ||
		!_.isEqual(props.showStyleBase.config, nextProps.showStyleBase.config) ||
		!_.isEqual(props.showStyleBase.sourceLayers, nextProps.showStyleBase.sourceLayers) ||
		!_.isEqual(props.showStyleBase.outputLayers, nextProps.showStyleBase.outputLayers)
	) {
		return true
	}

	return false
})(class extends MeteorReactComponent<IProps & ITrackedProps, IState> {
	renderPart (part: PartUi) {
		let labels:JSX.Element[] = []
		let timelineItems:JSX.Element[] = []
		
		part.pieces
			.filter(piece => piece.sourceLayer && piece.sourceLayer.onPresenterScreen)
			.forEach(piece => {
				labels.push(
					<div
						className={ClassNames(
							'camera-view__piece__header', 
							piece.sourceLayer && RundownUtils.getSourceLayerClassName(piece.sourceLayer.type)
						)}
						style={{backgroundColor: 'blue'}}
					>
						{(piece.sourceLayer && piece.sourceLayer.type === SourceLayerType.CAMERA && (piece.content as CameraContent).studioLabel) || piece.name}
					</div>
				)
				timelineItems.push(
					<div
						className={ClassNames(
							'camera-view__piece__timeline-element', 
							piece.sourceLayer && RundownUtils.getSourceLayerClassName(piece.sourceLayer.type))
						}
						style={{
							left: ((part.startsAt+(piece.renderedInPoint || 0))*this.props.timeScale)+'px', 
							width: ((piece.renderedDuration || part.expectedDuration || 0)*this.props.timeScale)+'px',
							backgroundColor: 'blue'
						}}
					>
					</div>
				)
			}
		)
		return <div className="camera-view__part" style={{padding: '10px', backgroundColor: 'red'}}>
			<h3>{part.startsAt} / {part.expectedDuration} - {part.autoNext ? 'autoNext' : ''}</h3>
			<div className="camera-view-labels">
				{labels}
			</div>
			<div className="camera-view-timeline">
				{timelineItems}
			</div>
		</div>
	}

	render () {
		return <>
			<h2>Segment: {this.props.segmentui && this.props.segmentui.name}</h2>
			<div>{this.props.parts.map(part => this.renderPart(part))}</div>
		</>
	}
})
