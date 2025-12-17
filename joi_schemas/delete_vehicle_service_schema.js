const Joi = require("joi");

const delete_vehicle_service_schema = Joi.object({
  vehicle_id: Joi.string().required().messages({
    "any.required": "Vehicle ID is required. "
  })
});

module.exports = delete_vehicle_service_schema;