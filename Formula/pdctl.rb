class Pdctl < Formula
  desc "PagerDuty CLI for incident response"
  homepage "https://github.com/amir-jakoby/pdctl"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/amir-jakoby/pdctl/releases/download/v#{version}/pdctl-aarch64-apple-darwin.tar.gz"
      sha256 "PLACEHOLDER"
    end
    on_intel do
      url "https://github.com/amir-jakoby/pdctl/releases/download/v#{version}/pdctl-x86_64-apple-darwin.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  def install
    bin.install "pdctl"
    generate_completions_from_executable(bin/"pdctl", "completion")
  end

  test do
    assert_match "pdctl", shell_output("#{bin}/pdctl --version")
  end
end
