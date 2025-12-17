const Joi = require("joi");

const delete_account_service_schema = Joi.object({
  delete_reason: Joi.string().required().messages({
    "any.required": "Reason is required. "
  })
});

module.exports = delete_account_service_schema;