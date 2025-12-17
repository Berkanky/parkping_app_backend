const { Readable } = require('stream');
const crypto = require('crypto');

async function create_picture_grid_fs(req, vehicle_id, files) {

    var app_locals = req.app.locals;

    var pictures_bucket = app_locals.pictures_bucket;
    if (!pictures_bucket) throw new Error('pictures_bucket required.');

    var uploaded_pictures = [];

    for (var i = 0; i < files.length; i++) {

        var file_row = files[i];

        // Fotoğrafın kendisinden SHA256 üret (isteğe bağlı, audit/dedup için)
        var buffer_sha256 = crypto
            .createHash('sha256')
            .update(file_row.buffer)
            .digest('hex');

        var meta_data = {
            sha256: buffer_sha256,
            original_name: file_row.originalname,
            mime_type: file_row.mimetype,
            size: file_row.size,
            created_date: new Date(),
            type: file_row.type,
            user_id: req.UserId, //mesaj sahibi yani gönderen.
        };

        if( file_row.type === "vehicle_attachment" ) {
            Object.assign(meta_data, {
                vehicle_id: vehicle_id,
            });
        } else if( file_row.type === "message_attachment" ){
            Object.assign(meta_data, {
                owner_user_id: req.UserId, //Mesajı alan kişi.
                message_id: file_row.message_id
            });
        }

        var uploadStream = pictures_bucket.openUploadStream(file_row.originalname, {
            contentType: file_row.mimetype || 'application/octet-stream',
            metadata: meta_data
        });

        await new Promise((resolve, reject) => {
            Readable.from(file_row.buffer)
                .pipe(uploadStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        uploaded_pictures.push({
            file_id: uploadStream.id,
            metadata: meta_data
        });
    }

    return uploaded_pictures;
};

module.exports = create_picture_grid_fs;