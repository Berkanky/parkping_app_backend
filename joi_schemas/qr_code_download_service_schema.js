const Joi = require("joi");

const qr_code_download_service_schema = Joi.object({
  vehicle_id: Joi.string().required().messages({
    "any.required": "Vehicle ID is required. "
  })
});

module.exports = qr_code_download_service_schema;