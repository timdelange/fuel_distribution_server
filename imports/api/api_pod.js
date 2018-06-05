import {_} from 'lodash';
import { deepGet, deepHas, RandomID} from "../utils";

class PODapi {

  order=null;

  setOrder(delivery, orderIndex = 0) {
    this.delivery = delivery;
    this.orderIndex = orderIndex;
    this.order = deepGet(delivery, 'customer_orders.' + orderIndex);
    this.checkOrder();
  }
  getOrder() {
    return this.order;
  }
  checkOrder () {
    if (!_.isObject(this.order)) {
      throw "No valid order supplied";
    }
  }

  addDoc(doc = {}) {
    this.checkOrder();
    doc = {...{id: RandomID(6), images: [], tanks: {}}, ...doc};
    const pushKey = 'customer_orders.'+this.orderIndex+'.documents.POD';
    const pushSpec = {};
    pushSpec[pushKey] = doc;
    const modifier = {$push: pushSpec};
    Deliveries.update(this.delivery._id, modifier) ;
    return doc.id;
  }
  getDoc(key) {
    this.checkOrder();
    return _.find(this.delivery.customer_orders[this.orderIndex].documents.POD, (doc) => {
      return (doc.id === key);
    })
  }
  getDocIndex(key) {
    this.checkOrder();
    return _.findIndex(this.delivery.customer_orders[this.orderIndex].documents.POD, (doc) => {
      return (doc.id === key);
    })
  }
  updateDoc(key, doc) {
    this.checkOrder();
    let currentDoc = this.getDoc(key);
    _.assign(currentDoc, doc);
    const updateKey = 'customer_orders.'+this.orderIndex+'.documents.POD';
    const setSpec = {};
    setSpec[updateKey] = this.delivery.customer_orders[this.orderIndex].documents.POD;
    Deliveries.update(this.delivery._id, { $set: setSpec});
  }
  addImage(key, imageUrl) {
    check(key, String);
    if (_.isEmpty(key)) { console.log('no doc key'); return null; };
    const image = { url: imageUrl, id: RandomID(6)};
    this.checkOrder();
    const docIndex=this.getDocIndex(key);
    const pushField = 'customer_orders.'+this.orderIndex+'.documents.POD.'+docIndex+'.images';
    const pushSpec = {};
    pushSpec[pushField] = image;
    const modifier = {$push: pushSpec};
    Deliveries.update(this.delivery._id, modifier) ;
    return image.id;
  }
  getImage(docKey, imageKey) {
    const doc = this.getDoc(docKey);
    const images = deepGet(doc, 'images');
    if (_.isArray(images)) {
      const image = _.find(images, (item) => {
        return (item.id === imageKey);
      });
      if (_.has(image, 'url'))
      return image.url;
    }
  }
  getImageIndex(docKey, imageKey) {
    const doc = this.getDoc(docKey);
    const images = deepGet(doc, 'images');
    if (_.isArray(images)) {
      const index = _.findIndex(images, (item) => {
        return (item.id === imageKey);
      });
      return index;
    }
  }
  removeImage(docKey, imageKey) {
    const docIndex=this.getDocIndex(docKey);
    const imageIndex = this.getImageIndex(docKey,imageKey);
    //const pullKey =  'customer_orders.' + this.orderIndex+'.documents.'+docIndex+'.images.'+imageIndex;
    const pullKey =  'customer_orders.' + this.orderIndex+'.documents.POD.'+docIndex+'.images';
    const pullParams = {}; pullParams[pullKey] = {id:imageKey};
    const modifier = { $pull: pullParams};
    Deliveries.update(this.delivery._id, modifier);
  }
  removeDoc(docKey) {
    //const docIndex=this.getDocIndex(docKey);
    //const doc=this.getDoc(docKey);
    const pullKey =  'customer_orders.' + this.orderIndex+'.documents.POD';
    const pullParams = {}; pullParams[pullKey] = {id:docKey};
    const modifier = { $pull: pullParams};
    Deliveries.update(this.delivery._id, modifier);
  }
  setDepartDate(docKey, time_t) {
    let updateKey = 'customer_orders.' + this.orderIndex+'.documents.POD.' + this.getDocIndex(docKey) + '.departure_time';
    let modifier = {};
    modifier[updateKey] = time_t;
    Deliveries.update(this.delivery._id, {$set: modifier});
  }
  setArriveDate(docKey, time_t) {
    let updateKey = 'customer_orders.' + this.orderIndex+'.documents.POD.' + this.getDocIndex(docKey) + '.arrival_time';
    let modifier = {};
    modifier[updateKey] = time_t;
    Deliveries.update(this.delivery._id, {$set: modifier});
  }
  setField(docKey, fieldName, value) {
    let updateKey = 'customer_orders.' + this.orderIndex+'.documents.POD.' + this.getDocIndex(docKey) + '.' + fieldName;
    let modifier = {};
    modifier[updateKey] = value;
    Deliveries.update(this.delivery._id, {$set: modifier});
  }
  getTank(docKey, tankNo) {
    const doc = this.getDoc(docKey);
    const tank = deepGet(doc, ['tanks',tankNo]);
    return tank;
  }
  getUnusedTankNumbers(docKey) {
    let tankNos = [];
    check(docKey, String);
    if (_.isEmpty(docKey)) { console.log('no doc key'); return null; };
    this.checkOrder();
    const doc = this.getDoc(docKey);
    const tanks = deepGet(doc, 'tanks');
    if (_.isObject(tanks)) {
      for (let i=1;i<=10;i++){
        if (_.has(tanks,i)) continue;
        tankNos.push(i);
      }
    }
    return tankNos;
  }
  setTank(docKey, tankNo, tankData = { type: '', before: 0, after: 0 } ) {
    check(docKey, String);
    if (_.isEmpty(docKey)) { console.log('no doc key'); return null; };
    this.checkOrder();
    const doc = this.getDoc(docKey);
    const tanks = deepGet(doc, 'tanks');
    tanks[tankNo] = tankData;
    this.setField(docKey, 'tanks', tanks);
    return tankNo;
  }
  removeTank(docKey, tankNo) {
    check(docKey, String);
    if (_.isEmpty(docKey)) { console.log('no doc key'); return null; };
    this.checkOrder();
    const doc = this.getDoc(docKey);
    const tanks = deepGet(doc, 'tanks');
    delete tanks[tankNo];
    this.setField(docKey, 'tanks', tanks);
  }
  setSignature(docKey, signatureId, url) {
    this.setField(docKey, 'signature_'+signatureId, { url: url, time: (new Date()).getTime(), valid: true });
  }
  removeSignature(docKey, signatureId) {
    this.setField(docKey, 'signature_'+signatureId, { url: null, time: null, valid: false });
  }
  finalise(docKey) {
    this.setField(docKey, 'finalised', true);
  }
}

export default PODapi;
