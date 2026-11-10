# Add test-only Core Motion replay to a disposable CompatibilityConsumer.
require 'fileutils'
require 'json'
require 'pathname'
require 'xcodeproj'

abort 'Usage: prepare-runtime-smoke.rb /absolute/disposable/consumer' unless ARGV.length == 1
input = Pathname.new(ARGV.fetch(0))
abort 'Consumer path must be absolute' unless input.absolute?
consumer = input.realpath
repo = Pathname.new(__dir__).join('../..').realpath
abort 'Consumer must be outside the repository' if consumer == repo || consumer.to_s.start_with?(repo.to_s + '/')
package = JSON.parse(consumer.join('package.json').read)
abort 'Expected disposable CompatibilityConsumer' unless package.fetch('name') == 'CompatibilityConsumer'
project = Xcodeproj::Project.open(consumer.join('ios/CompatibilityConsumer.xcodeproj'))
target = project.targets.find { |item| item.name == 'CompatibilityConsumer' }
abort 'Missing CompatibilityConsumer target' unless target
source = repo.join('tests/ios/RuntimePedometer.mm').to_s
reference = project.files.find { |item| item.real_path.to_s == source } || project.main_group.new_file(source)
target.source_build_phase.add_file_reference(reference) unless target.source_build_phase.files_references.include?(reference)
target.add_system_framework('CoreMotion')
project.save
FileUtils.cp(repo.join('tests/ios/runtime-smoke.ts'), consumer.join('runtime-smoke.ts'))
consumer.join('index.js').write("import './runtime-smoke';\n")
puts "Prepared replay-only runtime fixture in #{consumer}"
