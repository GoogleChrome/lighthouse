## How to compile protos + use locally

You'll need to have **`v3.20+`** of protobuf.

Note that they [changed the versioning scheme](https://developers.google.com/protocol-buffers/docs/news/2022-05-06#versioning) and went from `3.20.1` to `4.21.0`. Making it more confusing, in `brew` and Github, `4.21.x` is shown as `v21.x`.


1. Install the proto compiler with `brew install protobuf`, or something [like this](https://github.com/GoogleChrome/lighthouse/blob/9fd45c5e2b92e3b1f10b642ea631dd5a9598f5ee/.github/workflows/unit.yml#L32-L45).
1. Run `yarn test-proto`

## Proto Resources
- [Protobuf GitHub Repo](https://github.com/protocolbuffers/protobuf)
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
