import {Container} from '@ziggurat/tiamat';
import {json} from '../../src/json';
import {Directory} from '../../src/adapters/directory';
import {join} from 'path';
import {expect} from 'chai';
import 'mocha';
import * as mockfs from 'mock-fs';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import * as chokidar from 'chokidar';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Directory', () => {
  const serializer = json()(<Container>{});
  const watcher = chokidar.watch([], {});
  const dir = new Directory(serializer, 'testdir', 'json', watcher);

  beforeEach(() => {
    mockfs({
      'testdir/doc1.json': '{"foo": "bar"}',
      'testdir/doc2.json': '{"foo": "bar"}'
    });
  });

  after(() => {
    mockfs.restore();
  });

  describe('read', () => {
    it('should read documents from file system', async () => {
      let docs = await dir.read();

      expect(docs).to.eql({
        doc1: {foo: 'bar'},
        doc2: {foo: 'bar'}
      });
    });

    it('should fail to read documents from directory that does not exist', () => {
      mockfs({});

      return expect(dir.read()).to.eventually.be.rejected;
    });
  });

  describe('write', () => {
    it('should write a new collection to file', async () => {
      await dir.write('doc1', {});

      return expect(fs.readFile('testdir/doc1.json', 'utf-8')).to.eventually.eql('{}');
    });
  });

  describe('events', () => {
    afterEach(() => {
      dir.removeAllListeners();
    });

    describe('file added in directory', () => {
      it('should trigger document-updated event', (done) => {
        dir.on('document-updated', (id: string, data: Object) => {
          expect(id).to.eql('doc1');
          expect(data).to.eql({foo: 'bar'});
          done();
        });

        watcher.emit('add', join('testdir', 'doc1.json'));
      });
    });

    describe('file updated in directory', () => {
      it('should trigger document-updated event', (done) => {
        dir.on('document-updated', (id: string, data: Object) => {
          expect(id).to.eql('doc1');
          expect(data).to.eql({foo: 'bar'});
          done();
        });

        watcher.emit('change', join('testdir', 'doc1.json'));
      });
    });

    describe('file removed in diretory', () => {
      it('should trigger document-removed event', (done) => {
        dir.on('document-removed', (id: string) => {
          expect(id).to.eql('doc1');
          done();
        });

        watcher.emit('unlink', join('testdir', 'doc1.json'));
      });
    });
  });
});
