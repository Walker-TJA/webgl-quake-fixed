var Dialog = require('installer/dialog');
var zip = require('lib/zip.js').zip;
var Lh4 = require('lib/lh4.js');
var assets = require('assets');

var Installer = function() {
    this.dialog = new Dialog('dialog');
    this.isLocal = window.location.hostname.indexOf('localhost') !== -1;
};

Installer.localUrl = 'data/pak0.pak'; //''data/quake106.zip';
Installer.crossOriginProxyUrl = 'https://cors-anywhere.herokuapp.com/';
Installer.mirrors = [ // TODO: Add more valid quake shareware mirrors.
    'https://ia800206.us.archive.org/view_archive.php?archive=/26/items/msdos_Quake106_shareware/msdos_Quake106_shareware.zip', //https://www.quaddicted.com/files/idgames/idstuff/quake/quake106.zip
];

Installer.prototype.error = function(message) {
    this.dialog.error(message);
};

Installer.prototype.download = function(done) {
    this.dialog.setCaption('Downloading shareware version of Quake (quake106.zip)...');
    var url = this.isLocal ?
        Installer.localUrl :
        Installer.crossOriginProxyUrl + Installer.mirrors[0];
    var unpacked = url.indexOf('pak') !== -1;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
    xhr.responseType = 'arraybuffer';

    var self = this;
    xhr.onreadystatechange = function() {
        self.dialog.setCaption('Download completed. Processing file...', this.readyState);
        xhr.onreadystatechange = null;
    };

    xhr.onload = function(e) {
        if (this.status === 200) {

            if (!unpacked) {
                self.unpack(this.response, done);
            } else {
                self.finalize(new Uint8Array(this.response), done);
            }
        } else {
            self.error('Download failed. Try again.');
        }
    };
    xhr.send();
};

Installer.prototype.unpack = function(response, done) {
    var blob = new Blob([response]);
    var self = this;
    zip.workerScriptsPath = 'js/lib/';
    zip.createReader(new zip.BlobReader(blob), function(reader) {
        reader.getEntries(function(entries) {
            if (entries.length <= 0 || entries[0].filename !== 'resource.1') {
                self.dialog.error('Downloaded archive was corrupt.');
                return;
            }
            var entry = entries[0];
            var writer = new zip.ArrayWriter(entry.uncompressedSize);
            self.dialog.setCaption('Extracting zip resources...');
            entry.getData(writer, function(buffer) {
                self.dialog.setCaption('Extracting lha resources...');
                var lha = new Lh4.LhaReader(new Lh4.LhaArrayReader(buffer));
                var data = lha.extract('ID1\\PAK0.PAK'); //maybe change to cap ID1
                self.finalize(data, done);
            });
        });
    });
};

Installer.prototype.finalize = function(data, done) {
    assets.setPak(data);
    this.dialog.setCaption('Starting up Quake...');
    this.dialog.hide();
    done();
};

Installer.prototype.start = function(done) {
    this.dialog.setCaption("Initiating download...");
    this.dialog.show();
    this.download(done);
};

module.exports = exports = new Installer();





