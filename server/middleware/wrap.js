// lets async route handlers throw errors into Express' error handler
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
