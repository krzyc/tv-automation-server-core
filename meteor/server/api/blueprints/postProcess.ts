import * as _ from 'underscore'
import { Piece } from '../../../lib/collections/Pieces'
import { AdLibPiece } from '../../../lib/collections/AdLibPieces'
import { extendMandadory, getHash } from '../../../lib/lib'
import {
	TimelineObjGeneric,
	TimelineObjRundown,
	TimelineObjType
} from '../../../lib/collections/Timeline'
import { Studio } from '../../../lib/collections/Studios'
import { Meteor } from 'meteor/meteor'
import {
	TimelineObjectCoreExt,
	IBlueprintPiece,
	IBlueprintAdLibPiece,
	RundownContext as IRundownContext,
	RundownContext,
} from 'tv-automation-sofie-blueprints-integration'
import { RundownAPI } from '../../../lib/api/rundown'
import { Timeline } from 'timeline-state-resolver-types'

export function postProcessPieces (innerContext: IRundownContext, pieces: IBlueprintPiece[], blueprintId: string, partId: string): Piece[] {
	let i = 0
	let partsUniqueIds: { [id: string]: true } = {}
	return _.map(_.compact(pieces), (itemOrig: IBlueprintPiece) => {
		let item: Piece = {
			rundownId: innerContext.rundown._id,
			partId: partId,
			status: RundownAPI.LineItemStatusCode.UNKNOWN,
			...itemOrig
		}

		if (!item._id) item._id = innerContext.getHashId(`${blueprintId}_${partId}_piece_${i++}`)
		if (!item.externalId && !item.isTransition) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": externalId not set for piece in ' + partId + '! ("' + innerContext.unhashId(item._id) + '")')

		if (partsUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": ids of pieces must be unique! ("' + innerContext.unhashId(item._id) + '")')
		partsUniqueIds[item._id] = true

		if (item.content && item.content.timelineObjects) {
			let timelineUniqueIds: { [id: string]: true } = {}
			item.content.timelineObjects = _.map(_.compact(item.content.timelineObjects), (o: TimelineObjectCoreExt) => {
				const item = convertTimelineObject(innerContext.rundown._id, o)

				if (!item._id) item._id = innerContext.getHashId(blueprintId + '_' + (i++))

				if (timelineUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": ids of timelineObjs must be unique! ("' + innerContext.unhashId(item._id) + '")')
				timelineUniqueIds[item._id] = true

				return item
			})
		}

		return item
	})
}

export function postProcessAdLibPieces (innerContext: IRundownContext, adLibPieces: IBlueprintAdLibPiece[], blueprintId: string, partId?: string): AdLibPiece[] {
	let i = 0
	let partsUniqueIds: { [id: string]: true } = {}
	return _.map(_.compact(adLibPieces), (itemOrig: IBlueprintAdLibPiece) => {
		let item: AdLibPiece = {
			_id: innerContext.getHashId(`${blueprintId}_${partId}_adlib_piece_${i++}`),
			rundownId: innerContext.rundown._id,
			partId: partId,
			status: RundownAPI.LineItemStatusCode.UNKNOWN,
			trigger: undefined,
			disabled: false,
			...itemOrig
		}

		if (!item.externalId) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": externalId not set for piece in ' + partId + '! ("' + innerContext.unhashId(item._id) + '")')

		if (partsUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": ids of pieces must be unique! ("' + innerContext.unhashId(item._id) + '")')
		partsUniqueIds[item._id] = true

		if (item.content && item.content.timelineObjects) {
			let timelineUniqueIds: { [id: string]: true } = {}
			item.content.timelineObjects = _.map(_.compact(item.content.timelineObjects), (o: TimelineObjectCoreExt) => {
				const item = convertTimelineObject(innerContext.rundown._id, o)

				if (!item._id) item._id = innerContext.getHashId(blueprintId + '_adlib_' + (i++))

				if (timelineUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in blueprint "' + blueprintId + '": ids of timelineObjs must be unique! ("' + innerContext.unhashId(item._id) + '")')
				timelineUniqueIds[item._id] = true

				return item
			})
		}

		return item
	})
}

export function postProcessStudioBaselineObjects (studio: Studio, objs: Timeline.TimelineObject[]): TimelineObjRundown[] {
	let timelineUniqueIds: { [id: string]: true } = {}
	return _.map(objs, (o, i) => {
		const item = convertTimelineObject('', o)

		if (!item._id) item._id = getHash(studio._id + '_baseline_' + (i++))

		if (timelineUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in blueprint "' + studio.blueprintId + '": ids of timelineObjs must be unique! ("' + item._id + '")')
		timelineUniqueIds[item._id] = true

		return item
	})
}

function convertTimelineObject (rundownId: string, o: TimelineObjectCoreExt): TimelineObjRundown {
	let item: TimelineObjRundown = extendMandadory<TimelineObjectCoreExt, TimelineObjRundown>(o, {
		_id: o.id,
		studioId: '', // set later
		rundownId: rundownId,
		objectType: TimelineObjType.RUNDOWN,
	})
	delete item['id']

	return item
}

export function postProcessPartBaselineItems (innerContext: RundownContext, baselineItems: Timeline.TimelineObject[]): TimelineObjGeneric[] {
	let i = 0
	let timelineUniqueIds: { [id: string]: true } = {}

	return _.map(_.compact(baselineItems), (o: TimelineObjGeneric): TimelineObjGeneric => {
		const item: TimelineObjGeneric = convertTimelineObject(innerContext.rundown._id, o)

		if (!item._id) item._id = innerContext.getHashId('baseline_' + (i++))

		if (timelineUniqueIds[item._id]) throw new Meteor.Error(400, 'Error in baseline blueprint: ids of timelineObjs must be unique! ("' + innerContext.unhashId(item._id) + '")')
		timelineUniqueIds[item._id] = true
		return item
	})
}