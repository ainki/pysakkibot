module.exports = Date.prototype.onlyDate = function () {
    var d = new Date(this);
    d.setHours(0, 0, 0, 0);
    return d;
};
