import React from 'react';
import ReactDOM from 'react-dom';

if (process.env.BROWSER) {
    require('./image-preview-upload');
}

class ImageHandler {
    onChange = null;
    canvas = null;

    minWidth = 0;
    minHeight = 0;

    zoom = 0;
    _translate = {
        x: 0,
        y: 0
    };
    _offset = {
        x: 0,
        y: 0
    };

    constructor(onChange) {
        this.onChange = onChange;
        this.canvas = document.createElement('canvas');
    }

    minSize(w, h) {
        this.minWidth = w;
        this.minHeight = h;

        this.hardZoom();
    }

    draw() {
        const ctx = this.canvas.getContext('2d'),
            t = this.hardTranslate();

        if (
            this.lastZoom === this.zoom &&
            this.lastTranslate.x === t.x &&
            this.lastTranslate.y === t.y
        ) {
            return;
        }

        this.lastZoom = this.zoom;
        this.lastTranslate = t;

        this.canvas.width = this.minWidth;
        this.canvas.height = this.minHeight;

        ctx.save();
        ctx.translate(
            (this.canvas.width - (this.img.width * this.zoom)) / 2 + t.x,
            (this.canvas.height - (this.img.height * this.zoom)) / 2 + t.y
        );
        ctx.scale(this.zoom, this.zoom);

        ctx.drawImage(this.img, 0, 0);
        ctx.restore();

        if (typeof this.onChange === 'function') {
            this.onChange();
        }
    }

    setFile(file) {
        const reader = new FileReader(),
            img = document.createElement('img');

        img.onload = function() {
            this._translate.x = this._translate.y = 0;
            this._offset.x = this._offset.y = 0;
            this.zoom = 0;

            // this is needed to keep jpegs from flashing
            // on drag
            this.img = document.createElement('canvas');
            this.img.width = img.width;
            this.img.height = img.height;
            this.img.getContext('2d')
                .drawImage(img, 0, 0);

            this.hardZoom();

            this.draw();
        }.bind(this);

        reader.onload = function(evt) {
            img.src = evt.target.result;
        }.bind(this);

        reader.readAsDataURL(file);
    }

    hardTranslate() {
        const halfImgHeight = (this.img.height * this.zoom) / 2,
            halfCanvasHeight = this.minHeight / 2,
            halfImgWidth = (this.img.width * this.zoom) / 2,
            halfCanvasWidth = this.minWidth / 2;
        let x = this._translate.x + this._offset.x,
            y = this._translate.y + this._offset.y;

        if (halfImgHeight - halfCanvasHeight < y) {
            y = halfImgHeight - halfCanvasHeight;
        }

        if (halfCanvasHeight - halfImgHeight > y) {
            y = halfCanvasHeight - halfImgHeight;
        }

        if (halfImgWidth - halfCanvasWidth < x) {
            x = halfImgWidth - halfCanvasWidth;
        }

        if (halfCanvasWidth - halfImgWidth > x) {
            x = halfCanvasWidth - halfImgWidth;
        }

        return { x: x, y: y };
    }

    hardZoom() {
        let zoom;

        if (!this.img) {
            return;
        }

        if (!this.minWidth || !this.minHeight) {
            return;
        }

        if (
            this.img.width / this.img.height >
            this.minWidth / this.minHeight
        ) {
            zoom = this.minHeight / this.img.height;
        } else {
            zoom = this.minWidth / this.img.width;
        }

        if (this.zoom < zoom) {
            this.zoom = zoom;
        }
    }

    translate(point) {
        if (!this.img) {
            return;
        }

        if (!this.minWidth || !this.minHeight) {
            return;
        }

        this._translate.x = point.x;
        this._translate.y = point.y;

        this.draw();
    }

    offset(point) {
        if (!this.img) {
            return;
        }

        if (!this.minWidth || !this.minHeight) {
            return;
        }

        this._translate.x = 0;
        this._translate.y = 0;
        this._offset.x = point.x;
        this._offset.y = point.y;
        this._offset = this.hardTranslate();

        this.draw();
    }
}

class EventTravel {
    x = 0;
    y = 0;

    constructor(evt) {
        this.x = evt.pageX;
        this.y = evt.pageY;
    }

    diff(evt) {
        return {
            x: evt.pageX - this.x,
            y: evt.pageY - this.y
        };
    }

    dist(evt) {
        const travel = this.diff(evt);

        return Math.sqrt(travel.x * travel.x + travel.y * travel.y);
    }
}

class ImagePreviewUpload extends React.Component {
    state = {
        isDragActive: false,
        isDragReject: false,
        width: 0,
        height: 0,
        loading: false
    };

    constructor(props) {
        super(props);

        this.image = new ImageHandler(this.updateImage.bind(this));

        this.boundMove = this.move.bind(this);
        this.boundEnd = this.end.bind(this);
    }

    componentDidMount() {
        this.node = ReactDOM.findDOMNode(this);
        this.node.appendChild(this.image.canvas);

        this.enterCounter = 0;
        this.image.minSize(
            this.node.offsetWidth,
            this.node.offsetHeight
        );
    }

    updateImage() {
        if (this.state.loading) {
            this.setState({
                loading: false
            });
        }
    }

    down(evt) {
        if (this.startEvt) {
            return;
        }

        this.startEvt = new EventTravel(evt);

        window.addEventListener('mousemove', this.boundMove, false);
        window.addEventListener('mouseup', this.boundEnd, false);
    }

    move(evt) {
        evt.preventDefault();
        this.image.translate(this.startEvt.diff(evt));
    }

    end(evt) {
        if (this.startEvt.dist(evt) < 5) {
            this.fileInputEl.value = null;
            this.fileInputEl.click();
        } else {
            this.image.offset(this.startEvt.diff(evt));
        }

        this.startEvt = null;

        window.removeEventListener('mousemove', this.boundMove);
        window.removeEventListener('mouseup', this.boundEnd);
    }

    onScroll(evt) {
        evt.preventDefault();
    }

    onDragEnter(evt) {
        let files = [],
            allFilesAccepted = false;

        evt.preventDefault();

        ++this.enterCounter;

        if (evt.dataTransfer && evt.dataTransfer.items) {
            files = Array.prototype.slice.call(files);
        }

        if (
            files.length === 1 &&
            files[0].type.match('image.*') &&
            (
                typeof this.props.accept !== 'function' ||
                this.props.accept(files[0])
            )
        ) {
            allFilesAccepted = true;
        }

        this.setState({
            isDragActive: allFilesAccepted,
            isDragReject: !allFilesAccepted
        });
    }

    onDragOver(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    }

    onDragLeave(evt) {
        evt.preventDefault();

        if (--this.enterCounter > 0) {
            return;
        }

        this.setState({
            isDragActive: false,
            isDragReject: false
        });
    }

    onDrop(evt) {
        let files;

        evt.preventDefault();

        this.enterCounter = 0;

        this.setState({
            isDragActive: false,
            isDragReject: false,
            loading: true
        });

        files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files;

        if (
            !files[0].type.match('image.*') ||
            (
                typeof this.props.accept === 'function' &&
                !this.props.accept(files[0])
            )
        ) {
            return;
        }

        this.image.setFile(files[0]);
    }

    render() {
        let loader;

        if (this.state.loading) {
            loader = <div className="loading">{ this.props.loader }</div>;
        }

        return (
            <div className="image-preview-upload"
                onMouseDown={ this.down.bind(this) }
                onDragEnter={ this.onDragEnter.bind(this) }
                onDragOver={ this.onDragOver.bind(this) }
                onDragLeave={ this.onDragLeave.bind(this) }
                onDrop={ this.onDrop.bind(this) }
                onScroll={ this.onScroll.bind(this) } >
                <input type="file"
                    ref={ (el) => this.fileInputEl = el }
                    onChange={ this.onDrop.bind(this) } />
                { loader }
            </div>
        );
    }
}

export default ImagePreviewUpload;
