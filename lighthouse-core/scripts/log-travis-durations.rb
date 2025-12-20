##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# @fileoverview This script logs durations of travis builds, for plotting

# step 1. generate github token and and use in .netrc
#   https://help.github.com/articles/creating-an-access-token-for-command-line-use/
#   Leave all scope checkboxes unchecked.
#   Place in your ~/.netrc file like so:
#     machine github.com login <token>

# step 2. install travis ruby library: https://github.com/travis-ci/travis.rb/
#   gem install travis
#   travis login --auto

# step 3. run this script and output to a file
#   ruby lighthouse-core/scripts/log-travis-durations.rb > results.txt
# (it'll take a minute pending on how big days_of_builds_to_consider is)

# step 4. paste into column 1 of this spreadsheet:
#   https://docs.google.com/spreadsheets/d/197M4SRTdDbbpg4uRDCr-tI5l48L2qsAGkxIcIncKKew/edit#gid=247558940
# view the chart in the second sheet

require 'travis'
require 'date'

config_path = ENV.fetch('TRAVIS_CONFIG_PATH') { File.expand_path('.travis', Dir.home) }
config = YAML.load_file(File.expand_path('config.yml', config_path))
access_token = config['endpoints'].values[0]['access_token']

Travis.access_token = access_token

$days_of_builds_to_consider = 5

puts "build, branch, state, started_at, duration"

def log_durations
  repository = Travis::Repository.find('GoogleChrome/lighthouse')
  repository.each_build do |build|
    # next unless Integer(build.number) < 8283

    next if build.started_at.nil?

    # quit paginating at some point.
    if build.started_at < Time.now.to_date.prev_day($days_of_builds_to_consider).to_time
      exit 0
    end

    build.jobs.each do |job|
      puts "#{job.number}, #{job.branch_info}, #{job.state}, #{job.started_at}, #{job.duration}"
    end
  end
end


log_durations
