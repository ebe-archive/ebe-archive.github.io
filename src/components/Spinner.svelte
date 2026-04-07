<script>
  export let message = "Searching...";
</script>

<div class="overlay">
  <div class="spinner-box">
    <div class="ring"></div>
    <p class="message">{message}</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spinner-box {
    text-align: center;
  }
  .ring {
    width: 3rem;
    height: 3rem;
    margin: 0 auto 1rem;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--accent, #ffb300);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .message {
    color: #fff;
    font-size: 1.1rem;
    margin: 0;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
