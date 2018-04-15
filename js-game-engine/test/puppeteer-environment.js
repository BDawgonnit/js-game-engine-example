const chalk = require('chalk')
const NodeEnvironment = require('jest-environment-node')
const puppeteer = require('puppeteer')
const fs = require('fs')
const os = require('os')
const path = require('path')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

class PuppeteerEnvironment extends NodeEnvironment {
	constructor(config) {
		super(config)
	}

	async setup() {
		console.log(chalk.green('Setup Puppeteer Test Environment.\n'))
		await super.setup()
		const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8')
		if (!wsEndpoint) {
			throw new Error('wsEndpoint not found')
		}
		this.global.__BROWSER__ = await puppeteer.connect({
			browserWSEndpoint: wsEndpoint,
		})

		// Set up the page we will use to run our tests
		const page = await this.global.__BROWSER__.newPage()
		await page.goto('http://localhost')
		page.on('console', msg => {
			for (let i = 0; i < msg.args.length; ++i)
				console.log(`${i}: ${msg.args[i]}`)
		})
		this.global.page = page
	}

	async teardown() {
		await super.teardown()
	}

	runScript(script) {
		return super.runScript(script)
	}
}

module.exports = PuppeteerEnvironment
