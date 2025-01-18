import os
import sys
import json
import subprocess
import lighthouse_result_pb2 as lhr_pb2
from google.protobuf.json_format import Parse, MessageToJson

path = os.path.realpath(__file__)
path_dir = os.path.dirname(path)

path_sample_preprocessed = path_dir + '/sample_v2_processed.json'
path_sample = path_dir + '/../../core/test/results/sample_v2.json'
path_round_trip = path_dir + '/../../.tmp/sample_v2_round_trip.json'

def clean():
    try:
        os.remove(path_sample_preprocessed)
    except OSError:
        pass

# clean workspace
clean()

# preprocess the sample json
cmd = [
    "node",
    "{0}/../../core/lib/proto-preprocessor.js".format(path_dir),
    "--in={0}/../../core/test/results/sample_v2.json".format(path_dir),
    "--out={0}/sample_v2_processed.json".format(path_dir)
]
process = subprocess.call(cmd)

# open json
with open(path_sample_preprocessed, 'r') as f:
    data = json.load(f)

# make empty proto lhr
proto_lhr = lhr_pb2.LighthouseResult()

# fill proto lhr with data from JSON
Parse(json.dumps(data), proto_lhr)

# convert proto back into json
round_trip_lhr = json.loads(MessageToJson(proto_lhr, including_default_value_fields=False))

# write the json to disk
with open(path_round_trip, 'w') as f:
    json.dump(round_trip_lhr, f, indent=4, sort_keys=True, separators=(',', ': '))
