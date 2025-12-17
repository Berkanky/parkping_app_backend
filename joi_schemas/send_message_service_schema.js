const Joi = require("joi");

const send_message_service_schema = Joi.object({
  message: Joi.string().required().messages({
    "any.required": "Message is required. "
  }),
  message_type: Joi.string().required().messages({
    "any.required": "Message type is required. "
  }),
  vehicle_id: Joi.string().required().messages({
    "any.required": "Vehicle ID is required. "
  })
});

module.exports = send_message_service_schema;