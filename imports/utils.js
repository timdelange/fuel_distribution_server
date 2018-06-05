import _ from 'lodash';

function deepHas(object, props) {
    if (_.isUndefined(props)) return false;
    if (! _.isArray(props)) {
        return object.hasOwnProperty(props);
    }
    if (props.length < 1) return false;

    if (props.length == 1) {
        return object.hasOwnProperty(props[0]);
    } else {
        var prop = props.shift();
        if (object.hasOwnProperty(prop))
            return deepHas(object[prop], props);
        else
            return false;
    }

}
function _deepGet(object, props) {
    object = object || {};
    if (_.isUndefined(props)) return undefined;
    if (! _.isArray(props)) {
        props = [props];
    }
    if (props.length < 1) return undefined;
    var prop;
    if (props.length == 1) {
        prop = props[0];
        var result;
        if (_.has(object, prop)) result = object[prop];
        return result;
    } else {
        prop = props.shift();
        if (object.hasOwnProperty(prop))
            return _deepGet(object[prop], props);
        else
            return undefined;
    }

}
function deepGet (object, props) {
    var propArray = props;
    if (typeof(props) === 'string') {
        propArray = props.split('.');
    }
    propArray = _.clone(propArray);
    return _deepGet(object, propArray);
}

function GetScreenViewport(){
    var e = window;
    var a = 'inner';
    if (!('innerWidth' in window)){
        a = 'client';
        e = document.documentElement || document.body;
    }
    return { width : e[ a+'Width' ] , height : e[ a+'Height' ] };
}

function GetImageTypeFromURLString(string) {
    var imageType = "unknown";
    if (string.indexOf('data:') === 0 ) {
        imageType = string.split(":")[1].split("/")[1].split(";")[0];
    } else if (string.indexOf('http') === 0 || string.indexOf('https') === 0 ) {
        imageType = "link";
    }

    return imageType;
};


function RandomID(length = 17) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export { GetImageTypeFromURLString, GetScreenViewport, deepGet, deepHas, RandomID };
