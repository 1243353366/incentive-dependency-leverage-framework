.PHONY: test audit serve

test:
	@node --test tests/*.test.js

audit:
	@node tools/audit.js

serve:
	@python3 -m http.server 8000
