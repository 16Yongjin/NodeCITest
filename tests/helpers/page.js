const puppeteer = require('puppeteer')
const sessionFactory = require('../factories/sessionFactory')
const userFactory = require('../factories/userFactory')

class CustomPage {
  static async build () {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    const customPage = new CustomPage(page)

    return new Proxy(customPage, {
      get(target, property) {
        return customPage[property] || browser[property] || page[property]
      }
    })
  }

  constructor (page) { this.page = page }

  async login () {
    const user = await userFactory()
    const { session, sig } = sessionFactory(user)

    await this.page.setCookie({ name: 'session', value: session })
    await this.page.setCookie({ name: 'session.sig', value: sig })
    await this.page.goto('http://localhost:3000/blogs')
    await this.page.waitFor('a[href="/auth/logout"]')
  }

  getContentsOf (selector) { return this.page.$eval(selector, el => el.innerHTML) }

  sendRequest (method, path, data) {
    return this.page.evaluate((_method, _path, _data) => {
      const options = {
        method: _method.toUpperCase(),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }

      if (options.method === 'POST')
        options.body = JSON.stringify(_data)

      return fetch(_path, options).then(res => res.json())
    }, method, path, data)
  }

  execRequests (actions = []) {
    return Promise.all(
      actions.map(({ method, path, data }) => this.sendRequest(method, path, data) )
    )
  }
}

module.exports = CustomPage
