const Joi = require("joi");

const picture_detail_service_schema = Joi.object({
  file_id: Joi.string().required().messages({
    "any.required": "File ID is required. "
  })
});

module.exports = picture_detail_service_schema;