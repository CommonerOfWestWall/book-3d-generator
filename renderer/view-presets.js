(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BookViewPresets = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_VIEWS = 100;
  var MAX_SELECTED = 106;
  var CONTROL_RE = /[\u0000-\u001F\u007F-\u009F]/g;
  var INVALID_FILENAME_RE = /[<>:"/\\|?*\u0000-\u001F\u007F-\u009F]/g;
  var RESERVED_BASENAME_RE = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  var VIEW_FIELDS = ['az', 'el', 'rotZ', 'zoom', 'height', 'fov', 'vanishX', 'vanishY'];
  var LEGACY_VIEW_FIELDS = ['az', 'el', 'rotZ', 'zoom', 'height'];
  var DEFAULT_PROJECTION = { fov: 35, vanishX: 0, vanishY: 0 };
  var VIEW_RANGES = {
    az: [-180, 180],
    el: [-180, 180],
    rotZ: [-180, 180],
    zoom: [8, 1000],
    height: [-1000, 1000],
    fov: [10, 70],
    vanishX: [-40, 40],
    vanishY: [-40, 40]
  };

  function fail(message) {
    throw new Error(message);
  }

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function normalizeName(value) {
    if (typeof value !== 'string') fail('视角名称必须是字符串');
    if (CONTROL_RE.test(value)) {
      CONTROL_RE.lastIndex = 0;
      fail('视角名称不能包含控制字符');
    }
    CONTROL_RE.lastIndex = 0;
    var normalized = value.trim().replace(/\s+/gu, ' ');
    var length = Array.from(normalized).length;
    if (length < 1) fail('视角名称不能为空');
    if (length > 40) fail('视角名称不能超过 40 个 Unicode 字符');
    return normalized;
  }

  function validateView(value, requireProjection) {
    if (!isPlainObject(value)) fail('视角数据必须是普通对象');
    var result = {};
    LEGACY_VIEW_FIELDS.forEach(function (field) {
      if (!Object.prototype.hasOwnProperty.call(value, field)) {
        fail('视角数据缺少字段 ' + field);
      }
      var number = value[field];
      var range = VIEW_RANGES[field];
      if (typeof number !== 'number' || !Number.isFinite(number)) {
        fail('视角字段 ' + field + ' 必须是有限数字');
      }
      if (number < range[0] || number > range[1]) {
        fail('视角字段 ' + field + ' 超出允许范围');
      }
      result[field] = number;
    });
    VIEW_FIELDS.slice(5).forEach(function (field) {
      if (!Object.prototype.hasOwnProperty.call(value, field)) {
        if (requireProjection) fail('视角数据缺少字段 ' + field);
        result[field] = DEFAULT_PROJECTION[field];
        return;
      }
      var number = value[field];
      var range = VIEW_RANGES[field];
      if (typeof number !== 'number' || !Number.isFinite(number)) {
        fail('视角字段 ' + field + ' 必须是有限数字');
      }
      if (number < range[0] || number > range[1]) {
        fail('视角字段 ' + field + ' 超出允许范围');
      }
      result[field] = number;
    });
    return result;
  }

  function validateId(value, label) {
    if (typeof value !== 'string' || value.length === 0) {
      fail(label + '必须是非空字符串');
    }
    if (value.indexOf('custom-') === 0 && !/^custom-[a-zA-Z0-9-]+$/.test(value)) {
      fail(label + '格式无效');
    }
    return value;
  }

  function decode(raw) {
    if (raw === null) return { views: [], selected: null };
    if (typeof raw !== 'string') fail('保存的视角数据必须是 JSON 字符串');

    var envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (error) {
      fail('保存的视角数据不是有效 JSON');
    }
    if (!isPlainObject(envelope) || (envelope.version !== 1 && envelope.version !== 2)) {
      fail('保存的视角数据版本或格式无效');
    }
    if (!Array.isArray(envelope.views) || envelope.views.length > MAX_VIEWS) {
      fail('保存的视角列表格式无效或超过 100 条');
    }

    var views = [];
    var ids = Object.create(null);
    var names = Object.create(null);
    envelope.views.forEach(function (entry) {
      if (!isPlainObject(entry)) fail('视角条目必须是普通对象');
      var id = validateId(entry.id, '视角 ID');
      if (!/^custom-[a-zA-Z0-9-]+$/.test(id)) fail('自定义视角 ID 格式无效');
      if (Object.prototype.hasOwnProperty.call(ids, id)) fail('视角 ID 不能重复');
      var name = normalizeName(entry.name);
      var nameKey = name.toLocaleLowerCase();
      if (Object.prototype.hasOwnProperty.call(names, nameKey)) fail('视角名称不能重复');
      ids[id] = true;
      names[nameKey] = true;
      views.push({ id: id, name: name, view: validateView(entry.view, envelope.version === 2) });
    });

    var selected = envelope.selected;
    if (selected !== null && !Array.isArray(selected)) fail('selected 必须是 null 或字符串数组');
    if (Array.isArray(selected)) {
      if (selected.length > MAX_SELECTED) fail('selected 不能超过 106 项');
      var selectedIds = Object.create(null);
      selected = selected.reduce(function (result, id) {
        validateId(id, 'selected ID');
        if (!Object.prototype.hasOwnProperty.call(selectedIds, id)) {
          selectedIds[id] = true;
          result.push(id);
        }
        return result;
      }, []);
    }
    return { views: views, selected: selected };
  }

  function encode(state) {
    if (!isPlainObject(state)) fail('视角状态必须是普通对象');
    var raw = JSON.stringify({ version: 1, views: state.views, selected: state.selected });
    var validated = decode(raw);
    return JSON.stringify({ version: 2, views: validated.views, selected: validated.selected });
  }

  function safeFilename(name) {
    if (typeof name !== 'string') return 'view';
    var result = name.replace(INVALID_FILENAME_RE, '_');
    var basename = result.split(/[.]/)[0].replace(/[. ]+$/g, '');
    result = result.replace(/[. ]+$/g, '_');
    if (RESERVED_BASENAME_RE.test(basename)) result = '_' + result;
    result = Array.from(result).slice(0, 60).join('');
    return result || 'view';
  }

  return {
    normalizeName: normalizeName,
    validateView: validateView,
    decode: decode,
    encode: encode,
    safeFilename: safeFilename
  };
}));
