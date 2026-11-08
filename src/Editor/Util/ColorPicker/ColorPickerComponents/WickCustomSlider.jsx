import React, { Component, createRef } from 'react'

class WickCustomSlider extends Component {
    constructor () {
        super();
        this.container = createRef(null);
        this.state = {
            // Used to re-render the hover pointer
            hoverOffset: null
        };
    }
    componentWillUnmount () {
        this.unbindEvents();
        // eslint-disable-next-line react/no-direct-mutation-state
        this.state.hoverOffset = null;
    }
    calculateOffset = (e) => {
        if (!this.container.current) return;
        const container = this.container.current;

        // e.pageX for MouseEvent, e.touches[0].pageX for TouchEvent
        const x = (typeof e.pageX === 'number') ? e.pageX : e.touches[0].pageX;
        const left = x - (container.getBoundingClientRect().left + window.pageXOffset);
        const y = (typeof e.pageY === 'number') ? e.pageY : e.touches[0].pageY;
        const top = y - (container.getBoundingClientRect().top + window.pageYOffset);

        let offsetX = Math.max(Math.min(left / container.clientWidth, 1), 0);
        let offsetY = Math.max(Math.min(top / container.clientHeight, 1), 0);
        return { x: offsetX, y: offsetY };
    }

    bindEvents = () => {
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
    }
    unbindEvents = () => {
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
    }
    handlePointer = (e) => {
        // Don't select text when dragging pointer
        e.preventDefault();

        if (!this.props.onMouseDownPointer) return this.handleContainer(e);
        this.props.onMouseDownPointer(e.currentTarget.dataset.wickPointerIndex);
    }
    handleContainer = (e) => {
        // Don't select text when dragging container
        e.preventDefault();

        // Check if one of the pointers were clicked
        if (e.target !== e.currentTarget) return;
        this.props.onMouseDownContainer(this.calculateOffset(e));
    }
    handleMouseMove = (e) => this.props.onMouseMove(this.calculateOffset(e));
    handleMouseUp = (e) => {
        this.unbindEvents();
        this.props.onMouseUp(this.calculateOffset(e));
    }
    handleTouchEnd = (e) => {
        if (e.touches.length > 0) {
            return this.props.onMouseUp(this.calculateOffset(e));
        }
        else {
            return this.props.onMouseUp(this.calculateOffset(e.changedTouches[0]));
        }
    }

    renderPointers () {
        return (
            <>
                {this.props.pointers.map((pointerItem, index) => {
                    let offset = (pointerItem.offset === undefined) ? pointerItem : pointerItem.offset;
                    let style = {};
                    if (typeof offset === 'number' && this.props.pointersDirection) {
                        if (this.props.pointersDirection.includes('x')) style.left = `${offset * 100}%`;
                        else style.top = `${offset * 100}%`;
                    }
                    else style = { left: `${offset.x * 100}%`, top: `${offset.y * 100}%` };
                    style.position = 'absolute';

                    return (
                        <this.props.pointerComponent className="wick-custom-slider-pointer"
                            key={`color-${pointerItem.color}-index-${index}`}
                            stopIndex={index}
                            onMouseDown={e => {this.handlePointer(e); this.bindEvents();}}
                            onTouchStart={this.handlePointer}
                            color={pointerItem.color}
                            pointerType={this.props.pointerType}
                            style={style}
                            {...this.props.pointerProps} />
                    );
                })}
            </>
        );
    }
    render () {
        return (
            <div className={`wick-custom-slider ${this.props.className}`}
                style={this.props.style && this.props.style.container} >
                <div className="wick-custom-slider-background"
                    ref={this.container}
                    onMouseMove={this.handleContainerHover}
                    onMouseLeave={this.handleContainerExit}
                    onMouseDown={e => {this.handleContainer(e); this.bindEvents();}}
                    onTouchStart={this.handleContainer}
                    onTouchMove={this.handleMouseMove}
                    onTouchEnd={this.handleTouchEnd}
                    onTouchCancel={this.handleTouchEnd}
                    style={this.props.style && this.props.style.background}>
                    {this.renderPointers()}
                    {this.props.getHoverColor && this.renderHoverPointer()}
                </div>
            </div>
        );
    }

    handleContainerHover = (e) => {
        // Check if hovering over a pointer
        if (e.target !== e.currentTarget || e.buttons !== 0)
            this.setState({ hoverOffset: null });
        else
            this.setState({ hoverOffset: this.calculateOffset(e) });
    }
    handleContainerExit = (e) => this.setState({ hoverOffset: null });
    renderHoverPointer () {
        if (!this.state.hoverOffset) return (<></>);
        let offset = this.state.hoverOffset,
            style  = { position: 'absolute', pointerEvents: 'none' };
        if (this.props.pointersDirection) {
            if (this.props.pointersDirection === 'x') {
                offset = offset.x;
                style.left = `${offset * 100}%`;
            }
            else {
                offset = offset.y;
                style.top = `${offset * 100}%`;
            }
        }
        else {
            style.left = `${offset.x * 100}%`;
            style.top  = `${offset.y * 100}%`;
        }
        return (
            <this.props.pointerComponent className="wick-custom-slider-pointer"
                stopIndex={-1}
                color={this.props.getHoverColor(offset)}
                pointerType={this.props.pointerType}
                style={style}
                {...this.props.pointerProps} />
        );
    }
}

export default WickCustomSlider;