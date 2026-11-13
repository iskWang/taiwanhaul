.PHONY: build test
build:
	mkdir -p build
	go run github.com/syumai/workers-go/cmd/workers-assets-gen -mode=go
	GOOS=js GOARCH=wasm go build -o ./build/app.wasm .

test:
	go test ./...
