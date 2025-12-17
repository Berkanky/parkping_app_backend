async function read_picture_grid_fs(req, vehicle_id, type, message_id){

    var app_db = req.app.locals.db;
    var files = [];

    if( type === "vehicle_attachment" ){
        
        files = await app_db
            .collection("pictures.files")
            .find({ "metadata.vehicle_id": vehicle_id })
            .project({
                _id: 1,
                filename: 1,
                uploadDate: 1,
                contentType: 1
            })
            .toArray();
    }
    else if( type === "message_attachment" ){

        files = await app_db
            .collection("pictures.files")
            .find({ "metadata.message_id": message_id })
            .project({
                _id: 1,
                filename: 1,
                uploadDate: 1,
                contentType: 1
            })
            .toArray();
    }

    return files;
};

module.exports = read_picture_grid_fs;