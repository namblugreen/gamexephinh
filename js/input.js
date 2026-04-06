export const Input = {
    dragging: null,
    mouseX: 0,
    mouseY: 0,
    onPiecePickup: null,
    onPieceDrop: null,
    onPieceCancel: null,
    onClick: null,

    init(canvas, renderer) {
        this.renderer = renderer;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            if (e.touches) {
                return {
                    x: (e.touches[0].clientX - rect.left) * scaleX,
                    y: (e.touches[0].clientY - rect.top) * scaleY,
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        };

        const onStart = (e) => {
            e.preventDefault();
            const pos = getPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;

            const slot = renderer.getSpawnSlot(pos.x, pos.y);
            if (slot >= 0 && this.onPiecePickup) {
                const piece = this.onPiecePickup(slot);
                if (piece) {
                    this.dragging = { pieceIndex: slot, piece };
                }
            }
        };

        const onMove = (e) => {
            e.preventDefault();
            const pos = e.touches
                ? { x: (e.touches[0].clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width),
                    y: (e.touches[0].clientY - canvas.getBoundingClientRect().top) * (canvas.height / canvas.getBoundingClientRect().height) }
                : getPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        };

        const onEnd = (e) => {
            if (this.dragging) {
                const gridPos = renderer.screenToGrid(this.mouseX, this.mouseY);
                if (gridPos && this.onPieceDrop) {
                    this.onPieceDrop(this.dragging.pieceIndex, gridPos.row, gridPos.col);
                } else if (this.onPieceCancel) {
                    this.onPieceCancel(this.dragging.pieceIndex);
                }
                this.dragging = null;
            } else if (this.onClick) {
                this.onClick(this.mouseX, this.mouseY);
            }
        };

        canvas.addEventListener('mousedown', onStart);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onEnd);

        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);
    },

    getGridHover() {
        if (!this.dragging) return null;
        return this.renderer.screenToGrid(this.mouseX, this.mouseY);
    },
};
