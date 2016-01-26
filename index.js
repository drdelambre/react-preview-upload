import React from 'react';
import ReactDOM from 'react-dom';
import DropZone from './drop-zone.jsx';
import EventTravel from './event-travel.js';
import ImageHandler from './image-handler.js';
import DragPreview from './drag-preview.jsx';
import velocity from 'velocity-animate';

if (process.env.BROWSER) {
    require('./image-preview-upload.less');
}

class ImagePreviewUpload extends React.Component {
    state = {
        loading: false,
        moving: false
    };

    constructor(props) {
        super(props);

        this.image = new ImageHandler();
        this.image.change(this.updateImage.bind(this));

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
                loading: false,
                moving: true
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

        if (this.startEvt.dist(evt) > 5) {
            this.setState({
                moving: true
            });
        }
    }

    end(evt) {
        if (this.startEvt.dist(evt) < 5) {
            this.fileInputEl.value = null;
            this.fileInputEl.click();
        } else {
            this.image.offset();
            this.setState({
                moving: false
            });
        }

        this.startEvt = null;

        window.removeEventListener('mousemove', this.boundMove);
        window.removeEventListener('mouseup', this.boundEnd);
    }

    onScroll(evt) {
        evt.preventDefault();
        evt.stopPropagation();

        this.image.zoom(evt.deltaY * 0.04);
    }

    onDrop(evt) {
        let files;

        this.setState({
            loading: false
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

    componentWillUpdate(nextProps, nextState) {
        if (nextState.moving !== this.state.moving) {
            if (nextState.moving) {
                velocity(this.image.canvas, {
                    scale: 0.25
                }, 200, [ 100, 12 ]);
            } else {
                velocity(this.image.canvas, {
                    scale: 1
                }, 200, [ 100, 12 ]);
            }
        }
    }

    render() {
        let loader, preview;

        if (this.state.loading) {
            loader = <div className="loading">{ this.props.loader }</div>;
        }

        if (this.state.moving) {
            preview = (
                <DragPreview
                    image={ this.image }
                    scale={ 0.25 } />
                );
        }

        return (
            <div className="image-preview-upload"
                onMouseDown={ this.down.bind(this) }
                onWheel={ this.onScroll.bind(this) } >
                <DropZone onDrop={ this.onDrop.bind(this) } />
                <input type="file"
                    ref={ (el) => this.fileInputEl = el }
                    onChange={ this.onDrop.bind(this) } />
                { preview }
                { loader }
            </div>
        );
    }
}

export default ImagePreviewUpload;
