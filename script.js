/**
 * Photo Frame Editor - Core Logic (Interactive & HD)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUpload = document.getElementById('imageUpload');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const framesList = document.getElementById('framesList');
    const canvas = document.getElementById('photoCanvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const zoomSlider = document.getElementById('zoomSlider');
    const canvasWrapper = document.querySelector('.canvas-wrapper');

    // Application State
    let state = {
        userImage: null,
        selectedFrame: null,
        canvasWidth: 2000, // HD resolution
        canvasHeight: 2000,
        
        // Interactive parameters
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        
        // Drag state
        isDragging: false,
        startX: 0,
        startY: 0
    };

    const frames = [
        { id: 'awamileague', name: 'Awamileague', src: 'uploads/frames/awamileague.png' }
        
    ];

    function initCanvas() {
        canvas.width = state.canvasWidth;
        canvas.height = state.canvasHeight;
        render();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (state.userImage) {
            ctx.save();
            
            // Apply transformations
            // Move to center of canvas + offset
            ctx.translate(canvas.width / 2 + state.offsetX, canvas.height / 2 + state.offsetY);
            ctx.scale(state.scale, state.scale);
            
            // Draw image centered at transformation point
            const drawWidth = state.userImage.width;
            const drawHeight = state.userImage.height;
            ctx.drawImage(state.userImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            
            ctx.restore();
        } else {
            ctx.fillStyle = '#e1e4e8';
            ctx.font = '60px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('No image uploaded', canvas.width / 2, canvas.height / 2);
        }

        // Draw Frame Overlay (Always on top)
        if (state.selectedFrame && state.selectedFrame.img) {
            ctx.drawImage(state.selectedFrame.img, 0, 0, canvas.width, canvas.height);
        }
    }

    function preloadFrames() {
        console.log("Starting to preload frames...");
        let loadedCount = 0;
        frames.forEach(frame => {
            const img = new Image();
            // Use crossOrigin to enable downloading later
            img.crossOrigin = "anonymous";
            img.onload = () => {
                console.log(`Frame loaded successfully: ${frame.name}`);
                frame.img = img;
                loadedCount++;
                if (loadedCount === frames.length) {
                    if (!state.selectedFrame) {
                        state.selectedFrame = frames[0];
                    }
                    renderGallery();
                    render();
                }
            };
            img.onerror = () => {
                // If CORS fails (likely if not using a server), retry without it
                console.warn(`CORS load failed for ${frame.name}, retrying...`);
                const retryImg = new Image();
                retryImg.onload = () => {
                    frame.img = retryImg;
                    loadedCount++;
                    if (loadedCount === frames.length) {
                        if (!state.selectedFrame) state.selectedFrame = frames[0];
                        renderGallery();
                        render();
                    }
                };
                retryImg.src = frame.src;
            };
            img.src = frame.src;
        });
    }

    function renderGallery() {
        framesList.innerHTML = '';
        frames.forEach(frame => {
            const div = document.createElement('div');
            div.className = `frame-item ${state.selectedFrame && state.selectedFrame.id === frame.id ? 'selected' : ''}`;
            const img = document.createElement('img');
            img.src = frame.src;
            div.appendChild(img);
            div.addEventListener('click', () => {
                state.selectedFrame = frame;
                renderGallery();
                render();
            });
            framesList.appendChild(div);
        });
    }

    // --- Interaction Logic ---

    // Handle Dragging
    const startDrag = (e) => {
        if (!state.userImage) return;
        state.isDragging = true;
        const pos = getEventPos(e);
        state.startX = pos.x - state.offsetX;
        state.startY = pos.y - state.offsetY;
    };

    const doDrag = (e) => {
        if (!state.isDragging) return;
        e.preventDefault();
        const pos = getEventPos(e);
        state.offsetX = pos.x - state.startX;
        state.offsetY = pos.y - state.startY;
        render();
    };

    const stopDrag = () => {
        state.isDragging = false;
    };

    const getEventPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Convert screen coordinates to canvas coordinate space
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    // Zoom via Slider
    zoomSlider.addEventListener('input', (e) => {
        state.scale = parseFloat(e.target.value);
        render();
    });

    // Zoom via Wheel
    canvasWrapper.addEventListener('wheel', (e) => {
        if (!state.userImage) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        state.scale *= delta;
        zoomSlider.value = state.scale;
        render();
    }, { passive: false });

    // Event Listeners for Drag
    canvasWrapper.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
    
    canvasWrapper.addEventListener('touchstart', startDrag);
    canvasWrapper.addEventListener('touchmove', doDrag);
    canvasWrapper.addEventListener('touchend', stopDrag);

    // --- Image Upload ---
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        errorMessage.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.userImage = img;
                
                // Initial Auto-Scale
                const innerSize = state.canvasWidth - 200;
                const imgMax = Math.max(img.width, img.height);
                state.scale = innerSize / imgMax;
                zoomSlider.value = state.scale;
                
                state.offsetX = 0;
                state.offsetY = 0;
                
                loadingIndicator.classList.add('hidden');
                render();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // --- HD Download ---
    downloadBtn.addEventListener('click', () => {
        if (!state.userImage) {
            showError('Please upload an image first!');
            return;
        }

        downloadBtn.textContent = 'Downloading...';
        downloadBtn.disabled = true;

        setTimeout(() => {
            try {
                // Try standard download first
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                const link = document.createElement('a');
                link.download = `photoframe-${Date.now()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                downloadBtn.textContent = 'Download PNG';
                downloadBtn.disabled = false;
            } catch (err) {
                console.error("Download Error:", err);
                showError('Browser Blocked: Please use http://localhost (XAMPP) to download. Standard security prevents downloading files opened directly from a folder.');
                downloadBtn.textContent = 'Download PNG';
                downloadBtn.disabled = false;
            }
        }, 100);
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    initCanvas();
    preloadFrames();
});
