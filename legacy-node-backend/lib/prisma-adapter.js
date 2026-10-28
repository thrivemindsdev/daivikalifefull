import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// Drops keys the Prisma model doesn't define (e.g. UI-only fields sent along with a document),
// which Prisma would otherwise reject with 'Unknown argument'.
const modelFields = {};
export function onlyModelFields(modelName, data) {
  if (!data || typeof data !== 'object') return data;
  if (!modelFields[modelName]) {
    const fieldEnum = Prisma[modelName.charAt(0).toUpperCase() + modelName.slice(1) + 'ScalarFieldEnum'];
    modelFields[modelName] = fieldEnum ? new Set(Object.keys(fieldEnum)) : null;
  }
  const allowed = modelFields[modelName];
  if (!allowed) return data;
  return Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
}

// Helper to normalize Prisma output (_id alias for id, toObject/toJSON support)
export function normalizeDoc(doc, modelName) {
  if (!doc) return null;
  if (Array.isArray(doc)) return doc.map(d => normalizeDoc(d, modelName));
  if (typeof doc !== 'object') return doc;
  
  const copy = { ...doc };
  if (copy.id && !copy._id) {
    copy._id = copy.id;
  }

  // Model-specific field mappings
  if (modelName === 'notification') {
    if (copy.targetUserId !== undefined && copy.userId === undefined) {
      copy.userId = copy.targetUserId;
    }
    if (copy.isRead !== undefined && copy.read === undefined) {
      copy.read = copy.isRead;
    }
  }

  // Attach Mongoose-compatible .toObject() and .toJSON() methods
  copy.toObject = function() {
    const obj = {};
    for (const [k, v] of Object.entries(this)) {
      if (typeof v !== 'function') {
        obj[k] = v;
      }
    }
    return obj;
  };
  copy.toJSON = function() {
    return this.toObject();
  };

  // Attach Mongoose-compatible .save() method
  if (modelName && prisma[modelName]) {
    copy.save = async function() {
      const updateData = {};
      for (const [k, v] of Object.entries(this)) {
        if (typeof v !== 'function' && k !== '_id' && k !== 'id') {
          updateData[k] = v;
        }
      }

      if (modelName === 'user' && updateData.password && !updateData.password.startsWith('$2a$') && !updateData.password.startsWith('$2b$')) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      if (modelName === 'notification') {
        if (updateData.userId !== undefined) {
          updateData.targetUserId = updateData.userId;
          delete updateData.userId;
        }
        if (updateData.read !== undefined) {
          updateData.isRead = updateData.read;
          delete updateData.read;
        }
        delete updateData.broadcastId;
      }

      const docId = (this.id || this._id || '').toString();
      const updated = await prisma[modelName].update({
        where: { id: docId },
        data: onlyModelFields(modelName, updateData),
      });
      return normalizeDoc(updated, modelName);
    };

    // Attach Mongoose-compatible .deleteOne() and .remove() method
    copy.deleteOne = async function() {
      const docId = (this.id || this._id || '').toString();
      if (!docId) return { deletedCount: 0 };
      const deleted = await prisma[modelName].delete({ where: { id: docId } }).catch(() => null);
      return { deletedCount: deleted ? 1 : 0 };
    };
    copy.remove = copy.deleteOne;
  }

  // Attach matchPassword for user model
  if (modelName === 'user') {
    copy.matchPassword = async function(enteredPassword) {
      if (!enteredPassword || !this.password) return false;
      try {
        if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
          return await bcrypt.compare(enteredPassword, this.password);
        }
        return enteredPassword === this.password;
      } catch (err) {
        console.error('matchPassword error:', err);
        return false;
      }
    };
  }

  return copy;
}

// Translate Mongoose filter to Prisma where
export function transformFilter(filter = {}, modelName = '') {
  if (!filter || typeof filter !== 'object') return {};
  if (Array.isArray(filter)) return filter.map(f => transformFilter(f, modelName));
  
  const where = {};

  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' || key === 'OR') {
      if (Array.isArray(val)) {
        where.OR = val.map(subFilter => transformFilter(subFilter, modelName));
      }
      continue;
    }

    if (key === '$and' || key === 'AND') {
      if (Array.isArray(val)) {
        where.AND = val.map(subFilter => transformFilter(subFilter, modelName));
      }
      continue;
    }

    if (key === '$nor') {
      if (Array.isArray(val)) {
        where.NOT = [{ OR: val.map(subFilter => transformFilter(subFilter, modelName)) }];
      }
      continue;
    }

    if (key === '$not' || key === 'NOT') {
      if (Array.isArray(val)) {
        where.NOT = val.map(subFilter => transformFilter(subFilter, modelName));
      } else if (typeof val === 'object' && val !== null) {
        where.NOT = transformFilter(val, modelName);
      }
      continue;
    }

    let prismaKey = key === '_id' ? 'id' : key;
    if (modelName === 'notification') {
      if (prismaKey === 'userId') prismaKey = 'targetUserId';
      if (prismaKey === 'read') prismaKey = 'isRead';
      if (prismaKey === 'broadcastId') {
        continue;
      }
    }

    if (val === null || val === undefined) {
      where[prismaKey] = val;
    } else if (val instanceof RegExp) {
      const patternStr = val.source || '';
      const isExact = patternStr.startsWith('^') && patternStr.endsWith('$');
      const cleanPattern = patternStr.replace(/^\^|\$$/g, '');
      where[prismaKey] = isExact
        ? { equals: cleanPattern, mode: 'insensitive' }
        : { contains: cleanPattern, mode: 'insensitive' };
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      const fieldCond = {};
      let hasOp = false;

      if ('$in' in val) {
        fieldCond.in = val.$in.map(v => (v && (v._id || v.id)) ? (v._id || v.id).toString() : v);
        hasOp = true;
      }
      if ('$nin' in val) {
        fieldCond.notIn = val.$nin.map(v => (v && (v._id || v.id)) ? (v._id || v.id).toString() : v);
        hasOp = true;
      }
      if ('$ne' in val) {
        const neVal = val.$ne;
        fieldCond.not = (neVal && (neVal._id || neVal.id)) ? (neVal._id || neVal.id).toString() : neVal;
        hasOp = true;
      }
      if ('$gt' in val) {
        fieldCond.gt = val.$gt;
        hasOp = true;
      }
      if ('$gte' in val) {
        fieldCond.gte = val.$gte;
        hasOp = true;
      }
      if ('$lt' in val) {
        fieldCond.lt = val.$lt;
        hasOp = true;
      }
      if ('$lte' in val) {
        fieldCond.lte = val.$lte;
        hasOp = true;
      }
      if ('$exists' in val) {
        if (val.$exists) {
          fieldCond.not = null;
        } else {
          where[prismaKey] = null;
          continue;
        }
        hasOp = true;
      }
      if ('$regex' in val) {
        let patternStr = '';
        if (val.$regex instanceof RegExp) {
          patternStr = val.$regex.source || '';
        } else if (typeof val.$regex === 'string') {
          patternStr = val.$regex;
        } else if (val.source) {
          patternStr = val.source;
        } else {
          patternStr = String(val.$regex || '');
        }
        const isExact = patternStr.startsWith('^') && patternStr.endsWith('$');
        const cleanPattern = patternStr.replace(/^\^|\$$/g, '');
        if (isExact) {
          fieldCond.equals = cleanPattern;
          fieldCond.mode = 'insensitive';
        } else {
          fieldCond.contains = cleanPattern;
          fieldCond.mode = 'insensitive';
        }
        hasOp = true;
      }

      if (hasOp) {
        where[prismaKey] = fieldCond;
      } else {
        where[prismaKey] = val;
      }
    } else {
      where[prismaKey] = val;
    }
  }

  return where;
}

// Translate Mongoose sort to Prisma orderBy
export function transformSort(sort = {}) {
  if (!sort || typeof sort !== 'object') return undefined;
  const orderBy = [];
  for (const [key, dir] of Object.entries(sort)) {
    const prismaKey = key === '_id' ? 'id' : key;
    orderBy.push({ [prismaKey]: (dir === -1 || dir === 'desc' || dir === 'descending') ? 'desc' : 'asc' });
  }
  return orderBy.length === 1 ? orderBy[0] : (orderBy.length > 1 ? orderBy : undefined);
}

// Chainable query helper for findMany
class QueryChain {
  constructor(modelName, where = {}) {
    this.modelName = modelName;
    this.where = where;
    this._orderBy = undefined;
    this._take = undefined;
    this._skip = undefined;
    this._select = undefined;
  }

  sort(sortObj) {
    this._orderBy = transformSort(sortObj);
    return this;
  }

  limit(n) {
    this._take = Number(n);
    return this;
  }

  skip(n) {
    this._skip = Number(n);
    return this;
  }

  select(fields) {
    return this;
  }

  populate() {
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      const results = await prisma[this.modelName].findMany({
        where: this.where,
        orderBy: this._orderBy,
        take: this._take,
        skip: this._skip,
      });
      const normalized = normalizeDoc(results, this.modelName);
      return resolve(normalized);
    } catch (err) {
      if (reject) return reject(err);
      throw err;
    }
  }

  catch(reject) {
    return this.then(value => value, reject);
  }
}

// Chainable query helper for findOne
class SingleDocQueryChain {
  constructor(modelName, where = {}) {
    this.modelName = modelName;
    this.where = where;
    this._orderBy = undefined;
    this._select = undefined;
  }

  sort(sortObj) {
    this._orderBy = transformSort(sortObj);
    return this;
  }

  select(fields) {
    return this;
  }

  populate() {
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      const doc = await prisma[this.modelName].findFirst({
        where: this.where,
        orderBy: this._orderBy,
      });
      const normalized = normalizeDoc(doc, this.modelName);
      return resolve(normalized);
    } catch (err) {
      if (reject) return reject(err);
      throw err;
    }
  }

  catch(reject) {
    return this.then(value => value, reject);
  }
}

// Chainable query helper for findById
class FindByIdQueryChain {
  constructor(modelName, id) {
    this.modelName = modelName;
    this.id = id ? id.toString() : null;
    this._select = undefined;
  }

  select(fields) {
    return this;
  }

  populate() {
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      if (!this.id) return resolve(null);
      const doc = await prisma[this.modelName].findUnique({ where: { id: this.id } }).catch(() => null)
        || await prisma[this.modelName].findFirst({ where: { id: this.id } }).catch(() => null);
      const normalized = normalizeDoc(doc, this.modelName);
      return resolve(normalized);
    } catch (err) {
      if (reject) return reject(err);
      throw err;
    }
  }

  catch(reject) {
    return this.then(value => value, reject);
  }
}

// Create a Mongoose-compatible adapter for a Prisma model
export function createModelAdapter(modelName) {
  function Model(data = {}) {
    if (!(this instanceof Model)) {
      return new Model(data);
    }
    Object.assign(this, data);
    
    // Attach Mongoose-compatible .save() method
    this.save = async function() {
      const dataToSave = {};
      for (const [k, v] of Object.entries(this)) {
        if (typeof v !== 'function' && k !== '_id' && k !== 'id') {
          dataToSave[k] = v;
        }
      }
      
      const docId = (this.id || this._id || '').toString();
      if (docId) {
        const existing = await prisma[modelName].findUnique({ where: { id: docId } }).catch(() => null);
        if (existing) {
          const updated = await Model.findByIdAndUpdate(docId, dataToSave);
          Object.assign(this, updated);
          return this;
        }
      }
      const created = await Model.create(dataToSave);
      Object.assign(this, created);
      return this;
    };

    this.toObject = function() {
      const obj = {};
      for (const [k, v] of Object.entries(this)) {
        if (typeof v !== 'function') {
          obj[k] = v;
        }
      }
      return obj;
    };

    this.toJSON = function() {
      return this.toObject();
    };
  }

  Model.find = function(filter = {}) {
    const where = transformFilter(filter, modelName);
    return new QueryChain(modelName, where);
  };

  Model.findOne = function(filter = {}) {
    const where = transformFilter(filter, modelName);
    return new SingleDocQueryChain(modelName, where);
  };

  Model.findById = function(id) {
    return new FindByIdQueryChain(modelName, id);
  };

  Model.create = async function(data) {
    const cleanData = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (typeof v !== 'function') {
        cleanData[k] = v;
      }
    }
    if (cleanData._id && !cleanData.id) {
      cleanData.id = cleanData._id.toString();
    }
    delete cleanData._id;

    if (modelName === 'notification') {
      if (cleanData.userId !== undefined) {
        cleanData.targetUserId = cleanData.userId;
        delete cleanData.userId;
      }
      if (cleanData.read !== undefined) {
        cleanData.isRead = cleanData.read;
        delete cleanData.read;
      }
      delete cleanData.broadcastId;
    }

    // Hash password automatically for User
    if (modelName === 'user' && cleanData.password && !cleanData.password.startsWith('$2a$') && !cleanData.password.startsWith('$2b$')) {
      cleanData.password = await bcrypt.hash(cleanData.password, 10);
    }

    const created = await prisma[modelName].create({ data: onlyModelFields(modelName, cleanData) });
    return normalizeDoc(created, modelName);
  };

  Model.insertMany = async function(docs = []) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    const results = [];
    for (const doc of docs) {
      const created = await this.create(doc);
      results.push(created);
    }
    return results;
  };

  Model.updateMany = async function(filter = {}, update = {}) {
    const where = transformFilter(filter, modelName);
    const rawUpdate = update.$set || update;
    const updateData = {};
    for (const [k, v] of Object.entries(rawUpdate || {})) {
      if (typeof v !== 'function' && k !== '_id' && k !== 'id' && k !== '$set') {
        updateData[k] = v;
      }
    }

    if (modelName === 'notification') {
      if (updateData.userId !== undefined) {
        updateData.targetUserId = updateData.userId;
        delete updateData.userId;
      }
      if (updateData.read !== undefined) {
        updateData.isRead = updateData.read;
        delete updateData.read;
      }
      delete updateData.broadcastId;
    }

    const res = await prisma[modelName].updateMany({
      where,
      data: onlyModelFields(modelName, updateData)
    });
    return { modifiedCount: res.count, matchedCount: res.count };
  };

  Model.findOneAndUpdate = async function(filter = {}, update = {}, options = {}) {
    const where = transformFilter(filter, modelName);
    const rawUpdate = update.$set || update;
    const updateData = {};
    for (const [k, v] of Object.entries(rawUpdate || {})) {
      if (typeof v !== 'function' && k !== '_id' && k !== 'id' && k !== '$set') {
        updateData[k] = v;
      }
    }

    if (modelName === 'notification') {
      if (updateData.userId !== undefined) {
        updateData.targetUserId = updateData.userId;
        delete updateData.userId;
      }
      if (updateData.read !== undefined) {
        updateData.isRead = updateData.read;
        delete updateData.read;
      }
      delete updateData.broadcastId;
    }

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updateData[k] = { increment: v };
      }
    }

    if (modelName === 'user' && updateData.password && !updateData.password.startsWith('$2a$') && !updateData.password.startsWith('$2b$')) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    let existing = await prisma[modelName].findFirst({ where });
    if (!existing && options.upsert) {
      const createData = { ...where, ...updateData };
      return await this.create(createData);
    }

    if (existing) {
      if (updateData.id) delete updateData.id;
      const updated = await prisma[modelName].update({
        where: { id: existing.id },
        data: onlyModelFields(modelName, updateData),
      });
      return normalizeDoc(updated, modelName);
    }
    return null;
  };

  Model.findByIdAndUpdate = async function(id, update = {}, options = {}) {
    const cleanId = (id || '').toString();
    const rawUpdate = update.$set || update;
    const updateData = {};
    for (const [k, v] of Object.entries(rawUpdate || {})) {
      if (typeof v !== 'function' && k !== '_id' && k !== 'id' && k !== '$set') {
        updateData[k] = v;
      }
    }

    if (modelName === 'notification') {
      if (updateData.userId !== undefined) {
        updateData.targetUserId = updateData.userId;
        delete updateData.userId;
      }
      if (updateData.read !== undefined) {
        updateData.isRead = updateData.read;
        delete updateData.read;
      }
      delete updateData.broadcastId;
    }

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updateData[k] = { increment: v };
      }
    }

    if (modelName === 'user' && updateData.password && !updateData.password.startsWith('$2a$') && !updateData.password.startsWith('$2b$')) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updated = await prisma[modelName].update({
      where: { id: cleanId },
      data: onlyModelFields(modelName, updateData),
    }).catch(() => null);

    return normalizeDoc(updated, modelName);
  };

  Model.findByIdAndDelete = async function(id) {
    const cleanId = (id || '').toString();
    const deleted = await prisma[modelName].delete({ where: { id: cleanId } }).catch(() => null);
    return normalizeDoc(deleted, modelName);
  };

  Model.deleteOne = async function(filter = {}) {
    const where = transformFilter(filter, modelName);
    const existing = await prisma[modelName].findFirst({ where });
    if (existing) {
      await prisma[modelName].delete({ where: { id: existing.id } });
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  Model.deleteMany = async function(filter = {}) {
    const where = transformFilter(filter, modelName);
    const res = await prisma[modelName].deleteMany({ where });
    return { deletedCount: res.count };
  };

  Model.countDocuments = async function(filter = {}) {
    const where = transformFilter(filter, modelName);
    return await prisma[modelName].count({ where });
  };

  Model.aggregate = async function(pipeline = []) {
    // Support for reviews aggregation
    if (modelName === 'review') {
      const all = await prisma.review.findMany();
      const grouped = {};
      all.forEach(r => {
        if (!grouped[r.productId]) grouped[r.productId] = { sum: 0, count: 0 };
        grouped[r.productId].sum += r.rating;
        grouped[r.productId].count++;
      });
      return Object.keys(grouped).map(pId => ({
        _id: pId,
        averageRating: grouped[pId].sum / grouped[pId].count,
        reviewCount: grouped[pId].count
      }));
    }

    // Support for product category breakdown aggregation
    if (modelName === 'product') {
      const all = await prisma.product.findMany({ select: { category: true } });
      const grouped = {};
      all.forEach(p => {
        if (p.category) {
          grouped[p.category] = (grouped[p.category] || 0) + 1;
        }
      });
      return Object.keys(grouped).map(cat => ({
        _id: cat,
        count: grouped[cat]
      }));
    }

    return [];
  };

  return Model;
}
