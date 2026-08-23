'use strict';

module.exports = function DreamSlashMeme(mod) {

	let enabled = true
	let cid
	let model
	let job
	let myPosition = null
	let myAngle = null
	let hitCount = 20
	let bossid = null
	let bossloc = null
	let monsters = []

	// Valkyrie is job 12
	const VALK_JOB = 12
	let valk_enab = false

	mod.command.add('ds', () => {
		enabled = !enabled
		mod.command.message(`[DS] Dream Slash meme is now ${enabled ? 'en' : 'dis'}abled.`)
	})

	mod.command.add('dshits', (arg) => {
		if (arg) {
			hitCount = parseInt(arg)
			mod.command.message(`[DS] Hit count set to ${hitCount}`)
		}
	})

	mod.hook('S_LOGIN', '*', (event) => {
		cid = event.gameId
		model = event.templateId
		job = (model - 10101) % 100
		valk_enab = (job === VALK_JOB)
		monsters = []
		bossid = null
		bossloc = null
	})

	mod.hook('S_LOAD_TOPO', 3, event => {
		monsters = []
		bossid = null
		bossloc = null
	})

	mod.hook('S_SPAWN_NPC', '*', event => {
		monsters.push({ gameId: event.gameId, loc: event.loc })
	})

	mod.hook('S_NPC_LOCATION', 3, event => {
		let monster = monsters.find(m => m.gameId === event.gameId)
		if (monster) monster.loc = event.loc
		if (bossid == event.gameId) bossloc = event.loc
	})

	mod.hook('S_DESPAWN_NPC', 3, event => {
		monsters = monsters.filter(m => m.gameId != event.gameId)
		if (bossid == event.gameId) {
			bossid = null
			bossloc = null
		}
	})

	mod.hook('S_BOSS_GAGE_INFO', 3, event => {
		bossid = event.id
		let monster = monsters.find(m => m.gameId === event.id)
		if (monster) bossloc = monster.loc
	})

	mod.hook('C_PLAYER_LOCATION', 5, (event) => {
		myPosition = event.loc
		myAngle = event.w
	})

	// Intercept Dream Slash via C_START_INSTANCE_SKILL and multiply it
	mod.hook('C_START_INSTANCE_SKILL', '*', (event) => {
		if (!enabled || !valk_enab) return
		// Dream Slash group is 18 (skill IDs 18xxxx / 10000 = 18)
		if (Math.floor(event.skill.id / 10000) !== 18) return

		mod.command.message(`[DS] Sending ${hitCount} hits!`)

		// Send the skill multiple times - each creates a new server-side instance
		for (let i = 0; i < hitCount; i++) {
			mod.send('C_START_INSTANCE_SKILL', 7, {
				skill: event.skill,
				loc: event.loc,
				w: event.w,
				continue: event.continue,
				targets: event.targets,
				endpoints: event.endpoints
			})
		}

		return false // Block the original (we already sent it in the loop)
	})

	// Also catch via C_START_SKILL
	mod.hook('C_START_SKILL', 7, { order: -1000 }, (event) => {
		if (!enabled || !valk_enab) return
		if (Math.floor(event.skill.id / 10000) !== 18) return

		mod.command.message(`[DS] Sending ${hitCount} hits via C_START_SKILL!`)

		// Build target
		let targets = [{ arrowId: 0, gameId: event.target || 0, hitCylinderId: 0 }]
		let endpoints = [event.dest]

		for (let i = 0; i < hitCount; i++) {
			mod.send('C_START_INSTANCE_SKILL', 7, {
				skill: event.skill,
				loc: event.loc,
				w: event.w,
				continue: false,
				targets: targets,
				endpoints: endpoints
			})
		}

		return false
	})
}
