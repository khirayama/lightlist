project_path = File.expand_path("../Lightlist.xcodeproj/project.pbxproj", __dir__)
project = File.read(project_path)
line_index = project.lines.index { |line| line.include?("SystemCapabilities =") }
abort("Push notification capability is missing from the generated Xcode project") unless line_index

line = project.lines[line_index]
if line.include?("com.apple.Push") && line.include?("= {")
  exit
end

expected = 'SystemCapabilities = "[\\"com.apple.Push\\": [\\"enabled\\": 1]]";'
abort("Unexpected generated SystemCapabilities value: #{line.strip}") unless line.include?(expected)

indent = line[/^\s*/]
replacement = [
  "#{indent}SystemCapabilities = {\n",
  "#{indent}\tcom.apple.Push = {\n",
  "#{indent}\t\tenabled = 1;\n",
  "#{indent}\t};\n",
  "#{indent}};\n",
]
lines = project.lines
lines[line_index, 1] = replacement
File.write(project_path, lines.join)
