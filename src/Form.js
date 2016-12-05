import FormErrors from './FormErrors'

class Form {
  /**
   * Create a new form instance.
   *
   * @param {Object} data
   * @param {Object} mergeData
   */
  constructor (data = {}, mergeData = {}) {
    Object.assign(this, data, mergeData)

    this.busy = false
    this.successful = false
    this.errors = new FormErrors()
  }

  /**
   * Set form data.
   *
   * @param {Object} data
   */
  set (data) {
    Object.keys(data).forEach(key => { this[key] = data[key] })
  }

  /**
   * Get the form data.
   *
   * @return {Object}
   */
  getData () {
    const data = {}

    Object.keys(this)
      .filter(key => !Form.ignore.includes(key))
      .forEach(key => { data[key] = this[key] })

    return data
  }

  /**
   * Start processing the form.
   */
  startProcessing () {
    this.errors.clear()
    this.busy = true
    this.successful = false
  }

  /**
   * Finish processing the form.
   */
  finishProcessing () {
    this.busy = false
    this.successful = true
  }

  /**
   * Clear the form.
   */
  clear () {
    this.errors.clear()
    this.successful = false
  }

  /**
   * Reset the form fields.
   */
  reset () {
    Object.keys(this)
      .filter(key => !Form.ignore.includes(key))
      .forEach(key => { this[key] = '' })
  }

  /**
   * Send the from via a GET request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  get (url) {
    return this.send('get', url)
  }

  /**
   * Send the from via a POST request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  post (url) {
    return this.send('post', url)
  }

  /**
   * Send the from via a PATCH request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  patch (url) {
    return this.send('patch', url)
  }

  /**
   * Send the from via a PUT request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  put (url) {
    return this.send('put', url)
  }

  /**
   * Send the form data via an HTTP request.
   *
   * @param  {String} method (get, post, patch, put)
   * @param  {String} url
   * @return {Promise}
   */
  send (method, url) {
    this.startProcessing()

    let body = this.getData()

    if (this.hasFile(body)) {
      body = this.toFormData(body)
    }

    if (method === 'get') {
      body = { params: body }
    }

    return new Promise((resolve, reject) => {
      Form.http[method](this.route(url), body)
        .then(response => {
          this.finishProcessing()

          resolve(response)
        })
        .catch(response => {
          this.busy = false
          this.errors.set(this.extractErrors(response))

          reject(response)
        })
    })
  }

  /**
   * Extract the errors from the response object.
   *
   * @param  {Object} response
   * @return {Object}
   */
  extractErrors (response) {
    if (response.response) {
      response = response.response
    }

    if (!response.data) {
      return { error: 'Something went wrong. Please try again.' }
    }

    if (response.data.errors) {
      return { ...response.data.errors }
    }

    if (response.data.message) {
      return { error: response.data.message }
    }

    return { ...response.data }
  }

  /**
   * Determinte if the given object has any files.
   *
   * @param  {Object} obj
   * @return {Boolean}
   */
  hasFile (obj) {
    return Object.keys(obj).some(key =>
      obj[key] instanceof Blob || obj[key] instanceof FileList
    )
  }

  /**
   * Convert the given object to a FormData instance.
   *
   * @param  {Object} obj
   * @return {FormData}
   */
  toFormData (obj) {
    const data = new FormData()

    Object.keys(obj).forEach(key => {
      const value = obj[key]

      if (value instanceof FileList) {
        for (let i = 0; i < value.length; i++) {
          data.append(`${key}[]`, value.item(i))
        }
      } else {
        data.append(key, value)
      }
    })

    return data
  }

  /**
   * Get a named route.
   *
   * @param  {String} name
   * @return {Object} parameters
   * @return {String}
   */
  route (name, parameters = {}) {
    let url = name

    if (Form.routes.hasOwnProperty(name)) {
      url = decodeURI(Form.routes[name])
    }

    if (typeof parameters !== 'object') {
      parameters = { id: parameters }
    }

    Object.keys(parameters).forEach(key => {
      url = url.replace(`{${key}}`, parameters[key])
    })

    return url
  }
}

Form.routes = {}
Form.http = undefined
Form.ignore = ['busy', 'successful', 'errors', 'forms']

export default Form
