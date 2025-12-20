## How to compile protos + use locally

You'll need to have v3.7.1 of the protocol-buffer/protobuf compiler installed. (v3.7.1 is known to be compatible, and 3.11.x is known to be **not** compatible.).

1. Install the proto compiler by either
    1. Brew installing - `brew install protobuf@3.7`
    1. Manually installing from an [official release](https://github.com/protocolbuffers/protobuf/releases/tag/v3.7.1). There are [installation instructions](https://github.com/protocolbuffers/protobuf#protocol-compiler-installation), but these steps have worked well for us:
        ```sh
        mkdir protobuf-install && cd protobuf-install
        curl -L -o protobuf-python-3.7.1.zip https://github.com/protocolbuffers/protobuf/releases/download/v3.7.1/protobuf-python-3.7.1.zip
        unzip protobuf-python-3.7.1.zip
        cd protobuf-3.7.1

        cd python
        python setup.py build
        python setup.py test
        (cd .. && autogen.sh && configure && make)
        (cd .. && sudo make install)
        python setup.py build --cpp_implementation
        sudo python setup.py install --cpp_implementation
        ```
1. Run `yarn test-proto`

## Proto Resources
- [Protobuf Github Repo](https://github.com/protocolbuffers/protobuf) 
- [Protobuf Docs](https://developers.google.com/protocol-buffers/docs/overview)

## LHR Round Trip Flow
```
LHR round trip flow:
    (Compiling the Proto)
    lighthouse_result.proto -> protoc --python_out ... -> lighthouse_result.pb2
                                                                  ⭏
                                                               (used by)
    (Making a Round Trip JSON)                                     ⭏
    lhr.json --> proto_preprocessor.js -> lhr_processed.json -> json_roundtrip_via_proto.py -> lhr.round_trip.json
```

## Hacking Hints
- Clean out compiled proto and json with `yarn clean`
- Round trips might jumble the order of your JSON keys and lists!
- Is your `six` installation troubling your `pip install protobuf`? Mine did.  Try `pip install --ignore-installed six`.