import React from 'react';

if (process.env.BROWSER) {
    require('./drag-preview.less');
}

class DragPreview extends React.Component {
    state = {
        width: 0,
        height: 0,

        imgWidth: 0,
        imgHeight: 0,

        imgDeltaX: 0,
        imgDeltaY: 0
    };

    constructor(props) {
        super(props);

        /* isatanbul ignore else: no one cares */
        if (props.image) {
            this.boundRedraw = this.redraw.bind(this);
            props.image.change(this.boundRedraw);
        }
    }

    componentWillReceiveProps(props) {
        /* isatanbul ignore else: no one cares */
        if (props.image && props.image !== this.props.image) {
            props.image.change(this.redraw.bind(this));
        }
    }

    componentWillUnmount() {
        this.props.image.change.remove(this.boundRedraw);
    }

    redraw() {
        const scale = this.props.scale || 0.3,
            translate = this.props.image.hardTranslate();

        this.setState({
            width: this.props.image.minWidth * scale,
            height: this.props.image.minHeight * scale,

            imgWidth: this.props.image.img.width *
                this.props.image._zoom * scale,
            imgHeight: this.props.image.img.height *
                this.props.image._zoom * scale,

            imgDeltaX: translate.x * scale,
            imgDeltaY: translate.y * scale
        });
    }

    render() {
        let imageStyle = {};

        if (this.props.image.img) {
            imageStyle = {
                width: this.state.imgWidth,
                height: this.state.imgHeight,
                marginLeft: (this.state.imgWidth / -2) + this.state.imgDeltaX,
                marginTop: (this.state.imgHeight / -2) + this.state.imgDeltaY,
                backgroundImage: 'url(' + this.props.image.img.toDataURL() + ')'
            };
        }

        return (
            <div className="drag-preview">
                <div className="image"
                    style={ imageStyle } />
            </div>
        );
    }
}

export default DragPreview;
