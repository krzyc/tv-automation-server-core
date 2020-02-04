import { Meteor } from 'meteor/meteor'
import * as _ from 'underscore'
import { TransformedCollection } from '../typings/meteor'
import { IConfigItem, IBlueprintShowStyleVariant } from 'tv-automation-sofie-blueprints-integration'
import { registerCollection, applyClassToDocument } from '../lib'
import { ShowStyleBase, ShowStyleBases } from './ShowStyleBases'
import { ObserveChangesForHash, createMongoCollection } from './lib'

export interface DBShowStyleVariant extends IBlueprintShowStyleVariant {
	/** Id of parent ShowStyleBase */
	showStyleBaseId: string

	_rundownVersionHash: string
}

export interface ShowStyleCompound extends ShowStyleBase {
	showStyleVariantId: string
}
export function getShowStyleCompound (showStyleVariantId: string): ShowStyleCompound | undefined {
	let showStyleVariant = ShowStyleVariants.findOne(showStyleVariantId)
	if (!showStyleVariant) return undefined
	let showStyleBase = ShowStyleBases.findOne(showStyleVariant.showStyleBaseId)
	if (!showStyleBase) return undefined

	return createShowStyleCompound(showStyleBase, showStyleVariant)
}
export function createShowStyleCompound (showStyleBase: ShowStyleBase, showStyleVariant: ShowStyleVariant): ShowStyleCompound | undefined {
	if (showStyleBase._id !== showStyleVariant.showStyleBaseId) return undefined

	let configs: {[id: string]: IConfigItem} = {}
	_.each(showStyleBase.config, (config: IConfigItem) => {
		configs[config._id] = config
	})
	// Override base configs with variant configs:
	_.each(showStyleVariant.config, (config: IConfigItem) => {
		configs[config._id] = config
	})

	return _.extend(showStyleBase, {
		showStyleVariantId: showStyleVariant._id,
		name: `${showStyleBase.name}-${showStyleVariant.name}`,
		config: _.values(configs)
	})
}

export class ShowStyleVariant implements DBShowStyleVariant {
	public _id: string
	public name: string
	public showStyleBaseId: string
	public config: Array<IConfigItem>
	public _rundownVersionHash: string

	constructor (document: DBShowStyleVariant) {
		_.each(_.keys(document), (key) => {
			this[key] = document[key]
		})
	}
}
export const ShowStyleVariants: TransformedCollection<ShowStyleVariant, DBShowStyleVariant>
	= createMongoCollection<ShowStyleVariant>('showStyleVariants', { transform: (doc) => applyClassToDocument(ShowStyleVariant, doc) })
registerCollection('ShowStyleVariants', ShowStyleVariants)
Meteor.startup(() => {
	if (Meteor.isServer) {
		ShowStyleVariants._ensureIndex({
			showStyleBaseId: 1,
		})
	}
})

Meteor.startup(() => {
	if (Meteor.isServer) {
		ObserveChangesForHash(ShowStyleVariants, '_rundownVersionHash', ['config', 'showStyleBaseId'])
	}
})
