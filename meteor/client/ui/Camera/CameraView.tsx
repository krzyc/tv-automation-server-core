import { Meteor } from 'meteor/meteor'
import * as React from 'react'
import { translateWithTracker, Translated } from "../../lib/ReactMeteorData/ReactMeteorData"
import { MeteorReactComponent } from "../../lib/MeteorReactComponent"
import { Rundown, Rundowns } from "../../../lib/collections/Rundowns"
import { ShowStyleBase, ShowStyleBases } from "../../../lib/collections/ShowStyleBases"
import { Studio, Studios } from "../../../lib/collections/Studios"
import { PubSub } from "../../../lib/api/pubsub"
import { objectPathGet } from '../../../lib/lib'
import { Segment } from '../../../lib/collections/Segments'
import { CameraSegmentContainer } from './CameraSegmentContainer'
import { Spinner } from '../../lib/Spinner'
import { ErrorBoundary } from '../../lib/ErrorBoundary'
import { VirtualElement } from '../../lib/VirtualElement'

export interface IProps {

}

const SEGMENT_ELEMENT_ID = 'camera_view_segment_'

interface IState {

}

interface ITrackedProps {
	rundown?: Rundown
	studio?: Studio
	showStyleBase?: ShowStyleBase
	studioId: string
	studioLabel: string
	segments: Segment[]
}

export const CameraView = translateWithTracker<IProps, IState, ITrackedProps>((props: IProps) => {
	let studioId = objectPathGet(props, 'match.params.studioId')
	let studioLabel = objectPathGet(props, 'match.params.studioLabel')

	const rundown = Rundowns.findOne({
		studioId: studioId,
		active: true
	})

	let segments: Segment[] = []

	if (rundown) {
		segments = rundown.getSegments()
	}

	return {
		studioId,
		studioLabel,
		rundown: rundown,
		studio: rundown && Studios.findOne(rundown.studioId), 
		showStyleBase: rundown && ShowStyleBases.findOne(rundown.showStyleBaseId),
		segments
	}
})(class CameraView extends MeteorReactComponent<Translated<IProps & ITrackedProps>, IState> {
	componentDidMount () {
		this.subscribe(PubSub.rundowns, {
			studioId: this.props.studioId,
			active: true
		})
		this.subscribe(PubSub.studios, this.props.studioId)
		this.autorun(() => {
			let rundown = Rundowns.findOne({
				studioId: this.props.studioId,
				active: true
			})
		
			if (rundown) {
				this.subscribe(PubSub.showStyleBases, {
					_id: rundown.showStyleBaseId
				})
				this.subscribe(PubSub.segments, {
					rundownId: rundown._id
				})
				this.subscribe(PubSub.parts, {
					rundownId: rundown._id
				})
				this.subscribe(PubSub.pieces, {
					rundownId: rundown._id
				})
			}
		})

        document.body.classList.add('dark', 'vertical-overflow-only')
    }
    
    componentDidUpdate (prevProps: IProps & ITrackedProps, prevState: IState) {

    }

    renderSegments () {
		if (this.props.segments) {
			return this.props.segments.map((segment, index, array) => {
				if (
					this.props.studio &&
					this.props.rundown &&
					this.props.showStyleBase
				) {
					return <ErrorBoundary key={segment._id}>
							<VirtualElement
								id={SEGMENT_ELEMENT_ID + segment._id}
								margin={'100% 0px 100% 0px'}
								initialShow={index < (window.innerHeight / 260)}
								placeholderHeight={260}
								placeholderClassName='placeholder-shimmer-element segment-timeline-placeholder'
								width='auto'>
                                <CameraSegmentContainer
                                    id={SEGMENT_ELEMENT_ID + segment._id}
                                    segmentId={segment._id}
                                    studio={this.props.studio}
                                    showStyleBase={this.props.showStyleBase}
                                    rundown={this.props.rundown}
                                    timeScale={0.03}
                                />
							</VirtualElement>
						</ErrorBoundary>
				}
			})
		} else {
			return (
				<div></div>
			)
		}
	}

	renderSegmentsList () {
		const { t } = this.props

		if (this.props.rundown) {
			return (
				<div className='segment-timeline-container'>
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

	render () {
		return (<div className='camera-view'>
            <div>{this.props.studioId} {this.props.studioLabel}</div>
			<div>{this.props.rundown && this.props.rundown.name}</div>
			<div>{this.props.segments.length}</div>
            {this.renderSegmentsList()}
        </div>)
	}
})