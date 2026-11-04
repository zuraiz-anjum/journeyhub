// Small error class so route handlers can do `throw new HttpError(404, 'Story not found')`
// and the error middleware sends the right status code.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
