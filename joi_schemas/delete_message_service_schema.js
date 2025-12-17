const Joi = require("joi");

const delete_message_service_schema = Joi.object({
  message_id: Joi.string().required().messages({
    "any.required": "Message ID is required. "
  })
});

module.exports = delete_message_service_schema;