window.Utils = {
    showToast: function(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            }, duration);
        }
    },

    initClearButtons: function(containerSelector) {
        const containers = document.querySelectorAll(containerSelector);
        containers.forEach(container => {
            const inputs = container.querySelectorAll('input[type="text"], textarea');
            inputs.forEach(input => {
                const wrapper = input.parentElement;
                if (wrapper && wrapper.classList.contains('input-wrapper')) {
                    const clearBtn = wrapper.querySelector('.clear-button');
                    if (clearBtn) {
                        clearBtn.style.display = input.value ? 'block' : 'none';
                    }
                }
            });
        });
    }
};
