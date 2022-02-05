/*
 *  Licensed to the Apache Software Foundation (ASF) under one
 *  or more contributor license agreements.  See the NOTICE file
 *  distributed with this work for additional information
 *  regarding copyright ownership.  The ASF licenses this file
 *  to you under the Apache License, Version 2.0 (the
 *  "License"); you may not use this file except in compliance
 *  with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

/**
 * @author Igor Ostapenko
 */
'use strict';

const assert = require('assert');
const { dateSerializer } = require('../../../lib/structure/io/binary/GraphBinary');
const t = require('../../../lib/process/traversal');

const { from, concat } = Buffer;

describe('GraphBinary.DateSerializer', () => {

  const type_code =  from([0x04]);
  const value_flag = from([0x00]);

  const cases = [
    { v:undefined, fq:1, b:[0x04, 0x01],                              av:null },
    { v:undefined, fq:0, b:[0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00], av:new Date(0) },
    { v:null,      fq:1, b:[0x04, 0x01] },
    { v:null,      fq:0, b:[0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00], av:new Date(0) },

    { v:new Date('1970-01-01T00:00:00.000Z'), b:[0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00] },
    { v:new Date('1969-12-31T23:59:59.999Z'), b:[0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF] },

    { des:1, err:/buffer is missing/,         fq:1, b:undefined },
    { des:1, err:/buffer is missing/,         fq:0, b:undefined },
    { des:1, err:/buffer is missing/,         fq:1, b:null },
    { des:1, err:/buffer is missing/,         fq:0, b:null },
    { des:1, err:/buffer is empty/,           fq:1, b:[] },
    { des:1, err:/buffer is empty/,           fq:0, b:[] },

    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0x00] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0x03] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0x05] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0x40] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0x14] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0xF4] },
    { des:1, err:/unexpected {type_code}/,    fq:1, b:[0xFF] },

    { des:1, err:/{value_flag} is missing/,   fq:1, b:[0x04] },
    { des:1, err:/unexpected {value_flag}/,   fq:1, b:[0x04,0x10] },
    { des:1, err:/unexpected {value_flag}/,   fq:1, b:[0x04,0x02] },
    { des:1, err:/unexpected {value_flag}/,   fq:1, b:[0x04,0x0F] },
    { des:1, err:/unexpected {value_flag}/,   fq:1, b:[0x04,0xFF] },

    { des:1, err:/unexpected {value} length/, fq:1, b:[0x04,0x00] },
    { des:1, err:/unexpected {value} length/,       b:[0x11] },
    { des:1, err:/unexpected {value} length/,       b:[0x11,0x22,0x33,0x44, 0x05,0x06,0x07] },
  ];

  describe('serialize', () =>
    cases.forEach(({ des, v, fq, b }, i) => it(`should be able to handle case #${i}: ${v}`, () => {
      // deserialize case only
      if (des)
        return; // keep it like passed test not to mess with case index

      b = from(b);

      // when fq is under control
      if (fq !== undefined) {
        assert.deepEqual( dateSerializer.serialize(v, fq), b );
        return;
      }

      // generic case
      assert.deepEqual( dateSerializer.serialize(v, true),  concat([type_code, value_flag, b]) );
      assert.deepEqual( dateSerializer.serialize(v, false), concat([                       b]) );
    }))
  );

  describe('deserialize', () =>
    cases.forEach(({ v, fq, b, av, err }, i) => it(`should be able to handle case #${i}: ${v}`, () => {
      if (Array.isArray(b))
        b = from(b);

      // wrong binary
      if (err !== undefined) {
        if (fq !== undefined)
          assert.throws(() => dateSerializer.deserialize(b, fq), { message: err });
        else {
          assert.throws(() => dateSerializer.deserialize(concat([type_code, value_flag, b]), true),  { message: err });
          assert.throws(() => dateSerializer.deserialize(concat([                       b]), false), { message: err });
        }
        return;
      }

      if (av !== undefined)
        v = av;
      const len = b.length;

      // when fq is under control
      if (fq !== undefined) {
        assert.deepStrictEqual( dateSerializer.deserialize(b, fq), {v,len} );
        return;
      }

      // generic case
      assert.deepStrictEqual( dateSerializer.deserialize(concat([type_code, value_flag, b]), true),  {v,len:len+2} );
      assert.deepStrictEqual( dateSerializer.deserialize(concat([                       b]), false), {v,len:len+0} );
    }))
  );

  describe('canBeUsedFor', () =>
    // most of the cases are implicitly tested via AnySerializer.serialize() tests
    [
      { v: null,              e: false },
      { v: undefined,         e: false },
      { v: {},                e: false },
      { v: new t.Traverser(), e: false },
      { v: new t.P(),         e: false },
      { v: [],                e: false },
      { v: [0],               e: false },
      { v: [new t.P()],       e: false },
      { v: [new Date()],      e: false },
      { v: new Date(),        e: true  },
    ].forEach(({ v, e }, i) => it(`should be able to handle case #${i}: ${v}`, () =>
      assert.strictEqual( dateSerializer.canBeUsedFor(v), e )
    ))
  );

});
