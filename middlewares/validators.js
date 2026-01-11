const { validationResult } = require('express-validator');

function validateRequestPayload(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const responsePayload = [];
  for (const error of errors.array()) {
    responsePayload.push({
      field: error.path,
      message: error.msg,
    });
  }
  return res.status(422).send({ errors: responsePayload });
}

module.exports = { validateRequestPayload };
