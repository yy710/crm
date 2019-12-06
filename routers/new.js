const express = require('express');
const routerNew = express.Router();

routerNew.get('/',
    (req, res, next) => {
        next();
    }
)

module.exports = routerNew;