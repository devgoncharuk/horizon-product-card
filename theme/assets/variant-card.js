/**
 * Custom elements for the variant-switching product card.
 *
 * Two cooperating elements, wired by a bubbled CustomEvent so they
 * stay decoupled:
 *
 *   <variant-color-picker>
 *     Delegates the native `change` event on its child radio inputs into
 *     a `variant:selected` CustomEvent (bubbles), carrying a structured
 *     variant payload pulled from `data-variant-*` attributes on the input.
 *
 *   <variant-card>
 *     Listens for `variant:selected` and updates its DOM: image sources,
 *     price + compare-at, sale badge, permalink hrefs, and an ARIA live
 *     region announcement. Knows nothing about how the event was raised
 *     — other emitters (e.g., a size-picker) can hook into the same event.
 */

if (!customElements.get('variant-color-picker')) {
  class VariantColorPicker extends HTMLElement {
    connectedCallback() {
      this.addEventListener('change', this.#onChange);
    }

    #onChange = (event) => {
      const input = event.target.closest('input[data-variant]');
      if (!input) return;

      const d = input.dataset;
      this.dispatchEvent(new CustomEvent('variant:selected', {
        bubbles: true,
        detail: {
          id: d.variant,
          url: d.variantUrl,
          colorName: input.value,
          available: d.variantAvailable === 'true',
          onSale: d.variantOnSale === 'true',
          price: d.variantPrice,
          compareAt: d.variantCompareAt,
          image: d.variantImage
            ? { src: d.variantImage, srcset: d.variantImageSrcset, alt: d.variantImageAlt }
            : null,
          secondary: d.variantSecondary
            ? { src: d.variantSecondary, srcset: d.variantSecondarySrcset }
            : null,
        },
      }));
    };
  }

  customElements.define('variant-color-picker', VariantColorPicker);
}

if (!customElements.get('variant-card')) {
  class VariantCard extends HTMLElement {
    connectedCallback() {
      this.refs = {
        primary: this.querySelector('[data-primary-image]'),
        secondary: this.querySelector('[data-secondary-image]'),
        badge: this.querySelector('[data-sale-badge]'),
        price: this.querySelector('[data-price]'),
        compareAt: this.querySelector('[data-compare-at]'),
        priceGroup: this.querySelector('[data-price-group]'),
        cardLink: this.querySelector('[data-card-link]'),
        titleLink: this.querySelector('[data-title-link]'),
      };

      this.live = document.createElement('div');
      this.live.className = 'tw:sr-only';
      this.live.setAttribute('role', 'status');
      this.live.setAttribute('aria-live', 'polite');
      this.appendChild(this.live);

      this.addEventListener('variant:selected', this.#onVariantSelected);
    }

    #onVariantSelected = (event) => {
      const v = event.detail;
      this.#writeImage(this.refs.primary, v.image);
      this.#writeImage(this.refs.secondary, v.secondary);
      this.#writePrice(v.price, v.compareAt, v.onSale);
      this.#writeLinks(v.url);
      this.#writeBadge(v.onSale);
      this.live.textContent = v.available
        ? `Color selected: ${v.colorName}`
        : `Color selected: ${v.colorName} — sold out`;
    };

    #writeImage(el, image) {
      if (!el) return;
      if (!image || !image.src) {
        el.setAttribute('hidden', '');
        return;
      }
      el.src = image.src;
      if (image.srcset) el.srcset = image.srcset;
      if (image.alt !== undefined) el.alt = image.alt ?? '';
      el.removeAttribute('hidden');
    }

    #writePrice(price, compareAt, onSale) {
      const { price: priceEl, compareAt: compareEl, priceGroup } = this.refs;
      if (priceEl) {
        priceEl.textContent = price;
        priceEl.dataset.onSale = String(onSale);
      }
      if (compareEl) {
        compareEl.textContent = compareAt ?? '';
        compareEl.toggleAttribute('hidden', !onSale);
      }
      if (priceGroup) {
        priceGroup.setAttribute(
          'aria-label',
          onSale ? `On sale for ${price}, originally ${compareAt}` : price
        );
      }
    }

    #writeLinks(url) {
      if (!url) return;
      if (this.refs.cardLink) this.refs.cardLink.href = url;
      if (this.refs.titleLink) this.refs.titleLink.href = url;
    }

    #writeBadge(onSale) {
      this.refs.badge?.classList.toggle('tw:hidden!', !onSale);
    }
  }

  customElements.define('variant-card', VariantCard);
}
